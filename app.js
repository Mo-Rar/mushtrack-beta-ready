// ── Supabase Auth ──────────────────────────────────────────────
const SUPABASE_URL = "https://ipfnldjrpocceptavvaf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZm5sZGpycG9jY2VwdGF2dmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDk0MTQsImV4cCI6MjA5NjYyNTQxNH0.FVkq0EooacG7lETDAwxJ-ArocxUYFVZVfhxdhyWFhrI";
let supabase = null;
try {
  if (globalThis.supabase && typeof globalThis.supabase.createClient === "function") {
    supabase = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.warn("Supabase non disponible:", e);
}

let currentUser = null;

function showAuthOverlay() {
  document.getElementById("auth-overlay").classList.remove("hidden");
}

function hideAuthOverlay() {
  document.getElementById("auth-overlay").classList.add("hidden");
}

function setAuthError(msg) {
  const el = document.getElementById("auth-error");
  if (msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

let authMode = "login"; // "login" | "signup"

document.getElementById("forgot-pwd-btn")?.addEventListener("click", async () => {
  const email = document.getElementById("auth-email").value.trim();
  const msgEl = document.getElementById("forgot-msg");
  if (!email) {
    msgEl.style.display = "block";
    msgEl.style.color = "#d94040";
    msgEl.textContent = "Saisis ton email d'abord.";
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  msgEl.style.display = "block";
  if (error) {
    msgEl.style.color = "#d94040";
    msgEl.textContent = "Erreur : " + error.message;
  } else {
    msgEl.style.color = "#16a34a";
    msgEl.textContent = "Email envoyé ! Vérifie ta boîte de réception.";
  }
});

document.getElementById("auth-toggle-btn")?.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  const isSignup = authMode === "signup";
  document.getElementById("auth-submit").textContent = isSignup ? "Créer le compte" : "Se connecter";
  document.getElementById("auth-toggle-text").textContent = isSignup ? "Déjà un compte ?" : "Pas encore de compte ?";
  document.getElementById("auth-toggle-btn").textContent = isSignup ? "Se connecter" : "Créer un compte";
  document.getElementById("auth-password").autocomplete = isSignup ? "new-password" : "current-password";
  document.getElementById("auth-pseudo-label").style.display = isSignup ? "" : "none";
  setAuthError(null);
});

document.getElementById("auth-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const btn = document.getElementById("auth-submit");
  btn.disabled = true;
  btn.textContent = "...";
  setAuthError(null);

  try {
    let result;
    if (authMode === "signup") {
      const pseudo = document.getElementById("auth-pseudo")?.value.trim() || "";
      result = await supabase.auth.signUp({ email, password });
      if (!result.error && result.data?.user && !result.data.session) {
        setAuthError("Vérifiez votre email pour confirmer votre compte.");
        btn.disabled = false;
        btn.textContent = "Créer le compte";
        return;
      }
      if (!result.error && pseudo) {
        state.profile = state.profile || {};
        if (!state.profile.name) state.profile.name = pseudo;
        saveState();
      }
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
      setAuthError(result.error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect."
        : result.error.message);
      btn.disabled = false;
      btn.textContent = authMode === "signup" ? "Créer le compte" : "Se connecter";
      return;
    }

    currentUser = result.data.user;
    onAuthSuccess(currentUser);
  } catch (err) {
    setAuthError("Erreur réseau. Vérifiez votre connexion.");
    btn.disabled = false;
    btn.textContent = authMode === "signup" ? "Créer le compte" : "Se connecter";
  }
});

async function onAuthSuccess(user) {
  currentUser = user;
  // Synchronise le deviceId avec l'ID Supabase pour la communauté
  state.deviceId = user.id;
  saveState();
  hideAuthOverlay();
  addUserBar(user.email);
  // Réaffiche le panel admin maintenant qu'on connaît l'utilisateur
  renderAdminPanel();
  // Charge les données depuis le cloud (silencieux si rien de plus récent)
  await syncFromSupabase();
}

function addUserBar(email) {
  const existing = document.querySelector(".auth-user-bar");
  if (existing) existing.remove();
  const bar = document.createElement("div");
  bar.className = "auth-user-bar";
  bar.innerHTML = `<span>👤 ${email}</span><button class="text-button" id="logout-btn" type="button">Déconnexion</button>`;
  document.querySelector(".phone-shell").prepend(bar);
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    currentUser = null;
    bar.remove();
    showAuthOverlay();
  });
}

async function initAuth() {
  if (!supabase) return; // Supabase non disponible
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    onAuthSuccess(data.session.user);
  } else {
    showAuthOverlay();
  }
}

initAuth();

// ── Fin Auth ───────────────────────────────────────────────────

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-go]");
const bottomButtons = document.querySelectorAll(".bottom-nav button");
const recordButton = document.querySelector("#record-button");
const saveRunButton = document.querySelector("#save-run");
const finishRunButton = document.querySelector("#finish-run");
const postRunForm = document.querySelector("#post-run-form");
const distanceEl = document.querySelector("#distance");
const durationEl = document.querySelector("#duration");
const speedEl = document.querySelector("#speed");
const gpsStatusEl = document.querySelector("#gps-status");
const dogForm = document.querySelector("#dog-form");
const dogSubmitButton = document.querySelector("#dog-submit");
const settingsForm = document.querySelector("#settings-form");
const raceForm = document.querySelector("#race-form");
const openRunForm = document.querySelector("#open-run-form");
let activeDogId = null;
let editingDogId = null;

const raceCatalog = [
  {
    id: "ffslc-calendar",
    name: "Calendrier FFSLC",
    date: "",
    type: "Canicross",
    distance: 6,
    region: "France Europe",
    location: "France",
    source: "FFSLC",
    reliability: "official",
    surface: "Trail",
    url: "https://ffslc.fr/",
    notes: "Source officielle canicross, caniVTT, canitrottinette et ski-joering."
  },
  {
    id: "swiss-canicross-calendar",
    name: "Calendrier Swiss Canicross",
    date: "",
    type: "Canicross",
    distance: 7,
    region: "Suisse Switzerland Europe",
    location: "Suisse",
    source: "Swiss Canicross",
    reliability: "official",
    surface: "Trail",
    url: "https://swiss-canicross.ch/",
    notes: "Calendrier suisse pour trouver les prochaines courses canicross."
  },
  {
    id: "ifss-calendar",
    name: "Calendrier IFSS",
    date: "",
    type: "Sprint",
    distance: 12,
    region: "International Europe USA Canada World",
    location: "Europe / monde",
    source: "IFSS",
    reliability: "official",
    surface: "Neige Dryland",
    url: "https://sleddogsport.net/",
    notes: "Source internationale pour sleddog, sprint, mid-distance et championnats."
  },
  {
    id: "amundsen-race-2027",
    name: "Amundsen Race",
    date: "2027-02-20",
    type: "Longue distance",
    distance: 350,
    region: "Suede Sweden Stromsund Strömsund Europe Scandinavia",
    location: "Stromsund, Suede",
    source: "Amundsen Race / Stromsund",
    reliability: "watch",
    surface: "Neige",
    url: "https://www.amundsenrace.com/",
    notes: "Formats AR180, AR250 et AR350. Date 2027 ajoutee au radar comme info a verifier sur source officielle."
  },
  {
    id: "finnmarkslopet-2027",
    name: "Finnmarkslopet",
    date: "2027-03-05",
    type: "Longue distance",
    distance: 1200,
    region: "Norvege Norway Alta Finnmark Europe Scandinavia",
    location: "Alta, Norvege",
    source: "Finnmarkslopet",
    reliability: "official",
    surface: "Neige",
    url: "https://finnmarkslopet.no/",
    notes: "Europe longue distance. Le site officiel annonce le depart 2027 le 5 mars."
  },
  {
    id: "grande-odyssee-2027",
    name: "La Grande Odyssee Royal Canin",
    date: "2027-01-09",
    type: "Mid-distance",
    distance: 400,
    region: "France Alpes Savoie Haute-Savoie Europe",
    location: "Alpes francaises",
    source: "La Grande Odyssee",
    reliability: "official",
    surface: "Neige",
    url: "https://www.grandeodyssee.com/home",
    notes: "Course par etapes du 9 au 21 janvier 2027 selon le site officiel."
  },
  {
    id: "yukon-quest-2027",
    name: "Yukon Quest",
    date: "2027-02-06",
    type: "Longue distance",
    distance: 550,
    region: "Canada Yukon Whitehorse North America",
    location: "Whitehorse, Yukon, Canada",
    source: "Yukon Quest",
    reliability: "official",
    surface: "Neige",
    url: "https://yukonquest.com/",
    notes: "Retour annonce en 2027 avec formats YQ550 et YQ300."
  },
  {
    id: "iditarod-source",
    name: "Iditarod Trail Sled Dog Race",
    date: "",
    type: "Longue distance",
    distance: 1000,
    region: "USA Alaska Anchorage Nome North America",
    location: "Alaska, USA",
    source: "Iditarod",
    reliability: "official",
    surface: "Neige",
    url: "https://iditarod.com/",
    notes: "Source officielle a surveiller pour dates, inscriptions et reglements."
  },
  {
    id: "asdra-source",
    name: "ASDRA Alaska race schedule",
    date: "",
    type: "Sprint",
    distance: 12,
    region: "USA Alaska Anchorage North America",
    location: "Alaska, USA",
    source: "ASDRA",
    reliability: "official",
    surface: "Neige",
    url: "https://asdra.org/",
    notes: "Calendrier sprint et courses locales en Alaska."
  },
  {
    id: "cuvery-2026",
    name: "Course de Cuvery",
    date: "2026-01-17",
    type: "Mid-distance",
    distance: 40,
    region: "Ain Alpes France Jura",
    location: "Bellegarde-sur-Valserine, France",
    source: "L'Officiel",
    reliability: "calendar",
    surface: "Neige",
    url: "https://www.lofficiel.net/course-de-cuvery-ski-joring-traineau-sprint-et-mid_1_399431.aspx",
    notes: "Course traineau, skijoering, sprint et mi-distance. A verifier selon saison."
  },
  {
    id: "theopolitaine-2026",
    name: "Course Nature Theopolitaine",
    date: "2026-06-14",
    type: "Canicross",
    distance: 6,
    region: "France Centre Indre",
    location: "Villedieu-sur-Indre, France",
    source: "Ahotu",
    reliability: "calendar",
    surface: "Trail",
    url: "https://www.ahotu.com/fr/calendrier/canicross/france?years=2026",
    notes: "Course canicross referencee dans un calendrier public."
  },
  {
    id: "ahotu-europe-canicross",
    name: "Ahotu Canicross Europe",
    date: "",
    type: "Canicross",
    distance: 10,
    region: "Europe France Suisse UK Netherlands Ireland Italy",
    location: "Europe",
    source: "Ahotu",
    reliability: "calendar",
    surface: "Trail",
    url: "https://www.ahotu.com/fr/calendrier/canicross/europe",
    notes: "Calendrier public utile pour detecter de nombreuses courses canicross europeennes."
  },
  {
    id: "canicross-midlands-2027",
    name: "Canicross Midlands",
    date: "2027-01-16",
    type: "Dryland",
    distance: 5,
    region: "United Kingdom UK England Midlands Europe",
    location: "Midlands, Royaume-Uni",
    source: "Canicross Midlands",
    reliability: "calendar",
    surface: "Dryland",
    url: "https://www.canicrossmidlands.co.uk/race-dates",
    notes: "Series canicross, bikejor et scooter avec plusieurs dates 2026/2027."
  },
  {
    id: "canicross-nederland-2027",
    name: "Canicross Nederland kalender",
    date: "2027-01-17",
    type: "Dryland",
    distance: 5,
    region: "Netherlands Nederland Europe",
    location: "Pays-Bas",
    source: "Canicross Nederland",
    reliability: "calendar",
    surface: "Dryland",
    url: "https://www.canicrossnederland.nl/kalender20262027.html",
    notes: "Calendrier national canicross, bikejor et step."
  },
  {
    id: "csen-canicross-italy-2027",
    name: "Campionato Canicross CSEN",
    date: "2027-01-01",
    type: "Canicross",
    distance: 6,
    region: "Italie Italy Europe",
    location: "Italie",
    source: "CSEN Cinofilia",
    reliability: "calendar",
    surface: "Trail",
    url: "https://discipline.csencinofilia.it/calendario-gare-2027/",
    notes: "Calendrier italien canicross saison 2026/2027. Dates a verifier selon manche."
  },
  {
    id: "canicross-ireland-2027",
    name: "Canicross Ireland events",
    date: "2027-03-21",
    type: "Canicross",
    distance: 5,
    region: "Ireland Irlande Europe",
    location: "Irlande",
    source: "Canicross Ireland",
    reliability: "calendar",
    surface: "Trail",
    url: "https://www.canicross-ireland.com/upcoming-events",
    notes: "Evenements canicross irlandais saison 2026/2027."
  },
  {
    id: "mushing-cz-calendar",
    name: "Mushing.cz calendrier",
    date: "2027-02-17",
    type: "Sprint",
    distance: 20,
    region: "Czech Republic Tchequie Europe Finland Sweden IFSS",
    location: "Europe centrale / IFSS",
    source: "Mushing.cz",
    reliability: "calendar",
    surface: "Neige Dryland",
    url: "https://www.mushing.cz/",
    notes: "Calendrier mushing d'Europe centrale avec evenements IFSS et nationaux."
  },

  // ── Swiss Canicross 2026 — source : swiss-canicross.ch/course/ ──────
  {
    id: "swiss-canicross-saint-cierges-2026",
    name: "Canicross Saint-Cierges",
    date: "2026-09-12",
    type: "Canicross",
    distance: 7,
    region: "Suisse Switzerland Vaud Europe",
    location: "Saint-Cierges, Vaud",
    source: "Swiss Canicross",
    reliability: "official",
    surface: "Trail",
    url: "https://swiss-canicross.ch/course/",
    notes: "Ouverture vendredi 17h00. Week-end 12-13 septembre 2026."
  },
  {
    id: "swiss-canicross-yens-2026",
    name: "Canicross Yens",
    date: "2026-09-26",
    type: "Canicross",
    distance: 7,
    region: "Suisse Switzerland Vaud Europe",
    location: "Yens, Vaud",
    source: "Swiss Canicross",
    reliability: "official",
    surface: "Trail",
    url: "https://swiss-canicross.ch/course/",
    notes: "Ouverture samedi 9h00. Week-end 26-27 septembre 2026."
  },
  {
    id: "swiss-canitrail-bisses-2026",
    name: "Canitrail des Bisses",
    date: "2026-10-03",
    type: "Canicross",
    distance: 10,
    region: "Suisse Switzerland Valais Anzere Europe",
    location: "Anzère, Valais",
    source: "Swiss Canicross",
    reliability: "official",
    surface: "Trail",
    url: "https://swiss-canicross.ch/course/",
    notes: "Canitrail. Week-end 3-4 octobre 2026."
  },
  {
    id: "swiss-canicross-koppigen-2026",
    name: "Canicross Koppigen",
    date: "2026-10-10",
    type: "Canicross",
    distance: 7,
    region: "Suisse Switzerland Berne Europe",
    location: "Koppigen, Berne",
    source: "Swiss Canicross",
    reliability: "official",
    surface: "Trail",
    url: "https://swiss-canicross.ch/course/",
    notes: "Parking CHF 5. Ouverture vendredi 17h30. Week-end 10-11 octobre 2026."
  },
  {
    id: "swiss-canicross-givrine-2026",
    name: "Canicross La Givrine",
    date: "2026-10-17",
    type: "Canicross",
    distance: 7,
    region: "Suisse Switzerland Vaud Europe",
    location: "La Givrine, Vaud",
    source: "Swiss Canicross",
    reliability: "official",
    surface: "Trail",
    url: "https://swiss-canicross.ch/course/",
    notes: "Week-end 17-18 octobre 2026."
  },
  {
    id: "swiss-canicross-ardon-2026",
    name: "Canicross Ardon",
    date: "2026-10-24",
    type: "Canicross",
    distance: 7,
    region: "Suisse Switzerland Valais Ardon Europe",
    location: "Ardon, Valais",
    source: "Swiss Canicross",
    reliability: "official",
    surface: "Trail",
    url: "https://swiss-canicross.ch/course/",
    notes: "Week-end 24-25 octobre 2026."
  },

  // ── FFST Mushing (France — attelage / traineau) ──────────────────────
  {
    id: "ffst-calendar",
    name: "Calendrier FFST Mushing",
    date: "",
    type: "Sprint",
    distance: 12,
    region: "France Europe",
    location: "France",
    source: "FFST",
    reliability: "official",
    surface: "Neige Dryland",
    url: "https://ffstmushing.org/manifestations-sportives/",
    notes: "Fédération Française des Sports de Traineau. Championnats et épreuves attelage, mono-chien, snowland."
  },
  {
    id: "ffst-champ-france-2026",
    name: "Championnat de France Attelage FFST",
    date: "2026-12-05",
    type: "Sprint",
    distance: 12,
    region: "France Bretagne Nevet Europe",
    location: "Forêt du Nevet, Bretagne",
    source: "FFST",
    reliability: "official",
    surface: "Dryland",
    url: "https://ffstmushing.org/manifestations-sportives/",
    notes: "Championnat de France attelage & Championnat National mono-chien snowland. Organisé par Keremma Nordic Club. 5-6 décembre 2026."
  },

  // ── WSA World Sleddog Association ────────────────────────────────────
  {
    id: "wsa-calendar",
    name: "Calendrier WSA",
    date: "",
    type: "Sprint",
    distance: 20,
    region: "International Europe USA Canada World",
    location: "Europe / monde",
    source: "WSA",
    reliability: "official",
    surface: "Neige Dryland",
    url: "https://www.wsa-sleddog.com/en/",
    notes: "World Sleddog Association. Championnats mondiaux sprint, mid-distance, longue distance."
  },
  {
    id: "wsa-dryland-champ-2026",
    name: "WSA Dryland Championship 2026",
    date: "2026-11-20",
    type: "Dryland",
    distance: 15,
    region: "Allemagne Germany Stroehen Europe",
    location: "Stroehen, Allemagne",
    source: "WSA",
    reliability: "official",
    surface: "Dryland",
    url: "https://www.wsa-sleddog.com/en/",
    notes: "Championnat du monde WSA Dryland. 20-22 novembre 2026."
  },
  {
    id: "wsa-sprint-mid-champ-2027",
    name: "WSA Sprint & Mid-Distance World Championship 2027",
    date: "2027-01-22",
    type: "Sprint",
    distance: 20,
    region: "Allemagne Germany Unterjoch Europe",
    location: "Unterjoch, Allemagne",
    source: "WSA",
    reliability: "official",
    surface: "Neige",
    url: "https://www.wsa-sleddog.com/en/",
    notes: "Championnat du monde WSA sprint et mid-distance. 22-24 janvier 2027."
  },
  {
    id: "wsa-long-champ-2027",
    name: "WSA Long Distance World Championships 2027",
    date: "2027-02-25",
    type: "Longue distance",
    distance: 300,
    region: "Suede Sweden Stromsund Strömsund Europe Scandinavia",
    location: "Strömsund, Suède",
    source: "WSA",
    reliability: "official",
    surface: "Neige",
    url: "https://www.wsa-sleddog.com/en/",
    notes: "Championnat du monde WSA longue distance. 25-28 février 2027."
  },

  // ── Draghundsport Sverige (Suède) ────────────────────────────────────
  {
    id: "draghund-calendar",
    name: "Calendrier Draghundsport Sverige",
    date: "",
    type: "Sprint",
    distance: 15,
    region: "Suede Sweden Scandinavia Europe",
    location: "Suède",
    source: "Draghundsport SE",
    reliability: "official",
    surface: "Neige Dryland",
    url: "https://draghundsport.se/kalender/",
    notes: "Fédération suédoise de mushing. Championnats nationaux, Sweden Cup, épreuves dryland et neige."
  },

  // ── Canicross Midlands UK ─────────────────────────────────────────────
  {
    id: "canicross-midlands-calendar",
    name: "Calendrier Canicross Midlands",
    date: "",
    type: "Canicross",
    distance: 8,
    region: "Royaume-Uni UK England Midlands British",
    location: "Midlands, Angleterre",
    source: "Canicross Midlands",
    reliability: "official",
    surface: "Trail",
    url: "https://www.canicrossmidlands.co.uk/race-dates",
    notes: "Série de courses canicross, bikejoring et scootering en Angleterre."
  },
  {
    id: "canicross-midlands-boxend-2026",
    name: "Canicross Midlands — Box End",
    date: "2026-09-26",
    type: "Canicross",
    distance: 8,
    region: "Royaume-Uni UK England British",
    location: "Box End Water Park, Angleterre",
    source: "Canicross Midlands",
    reliability: "official",
    surface: "Trail",
    url: "https://www.canicrossmidlands.co.uk/race-dates",
    notes: "Canicross, bikejoring, scooter. Week-end 26-27 septembre 2026."
  },
  {
    id: "canicross-midlands-alcester-2026",
    name: "Canicross Midlands — Alcester",
    date: "2026-10-24",
    type: "Canicross",
    distance: 8,
    region: "Royaume-Uni UK England Warwickshire British",
    location: "Alcester, Warwickshire",
    source: "Canicross Midlands",
    reliability: "official",
    surface: "Trail",
    url: "https://www.canicrossmidlands.co.uk/race-dates",
    notes: "Canicross, bikejoring, scooter. Week-end 24-25 octobre 2026."
  },
  {
    id: "canicross-midlands-eland-2027",
    name: "Canicross Midlands — Eland Lodge",
    date: "2027-01-16",
    type: "Canicross",
    distance: 8,
    region: "Royaume-Uni UK England British",
    location: "Eland Lodge, Angleterre",
    source: "Canicross Midlands",
    reliability: "official",
    surface: "Trail",
    url: "https://www.canicrossmidlands.co.uk/race-dates",
    notes: "Canicross, bikejoring, scooter. Week-end 16-17 janvier 2027."
  },
  {
    id: "canicross-midlands-cattonhall-2027",
    name: "Canicross Midlands — Catton Hall",
    date: "2027-03-26",
    type: "Canicross",
    distance: 8,
    region: "Royaume-Uni UK England British",
    location: "Catton Hall, Angleterre",
    source: "Canicross Midlands",
    reliability: "official",
    surface: "Trail",
    url: "https://www.canicrossmidlands.co.uk/race-dates",
    notes: "Canicross, bikejoring, scooter. Easter Weekend 26-29 mars 2027."
  },

  // ── CaniCross Trailrunners UK ─────────────────────────────────────────
  {
    id: "canicross-uk-calendar",
    name: "Calendrier Canicross UK",
    date: "",
    type: "Canicross",
    distance: 8,
    region: "Royaume-Uni UK England Scotland British",
    location: "Royaume-Uni",
    source: "CaniCross UK",
    reliability: "official",
    surface: "Trail",
    url: "https://www.canicross.org.uk/racecalendar",
    notes: "Communauté britannique canicross, caniVTT, caniScoot. Nombreuses courses partout au Royaume-Uni."
  },

  // ── Courses majeures connues (à surveiller) ───────────────────────────
  {
    id: "finnmarkslопет-2027",
    name: "Finnmarksløpet",
    date: "2027-03-06",
    type: "Longue distance",
    distance: 500,
    region: "Norveге Norway Finnmark Alta Scandinavia",
    location: "Alta, Finnmark, Norvège",
    source: "Finnmarksløpet",
    reliability: "official",
    surface: "Neige",
    url: "https://www.finnmarkslопет.no/",
    notes: "La plus longue course de traineau en Europe. 500 km (FL500) et 1000 km (FL1000). Mars 2027."
  },
  {
    id: "femundlopet-2027",
    name: "Femundløpet",
    date: "2027-02-05",
    type: "Longue distance",
    distance: 400,
    region: "Norveге Norway Roros Røros Scandinavia",
    location: "Røros, Norvège",
    source: "Femundløpet",
    reliability: "official",
    surface: "Neige",
    url: "https://www.femundlopet.no/",
    notes: "Course de traineau en Norvège. 400 km et 170 km. Départ de Røros. Février 2027."
  },
  {
    id: "iditarod-2027",
    name: "Iditarod Trail Sled Dog Race",
    date: "2027-03-06",
    type: "Longue distance",
    distance: 1600,
    region: "Alaska USA United States America",
    location: "Anchorage → Nome, Alaska",
    source: "Iditarod",
    reliability: "official",
    surface: "Neige",
    url: "https://iditarod.com/",
    notes: "La course de traineau la plus célèbre au monde. ~1600 km à travers l'Alaska. Mars 2027."
  },
  {
    id: "yukon-quest-2027",
    name: "Yukon Quest International",
    date: "2027-02-01",
    type: "Longue distance",
    distance: 1600,
    region: "Canada Yukon Whitehorse Alaska USA",
    location: "Whitehorse, Yukon → Fairbanks, Alaska",
    source: "Yukon Quest",
    reliability: "official",
    surface: "Neige",
    url: "https://yukonquest.com/",
    notes: "Course de traineau de 1600 km entre le Yukon (Canada) et l'Alaska (USA). Février 2027."
  },
  {
    id: "grande-odyssee-2027",
    name: "La Grande Odyssée Savoie Mont-Blanc",
    date: "2027-01-08",
    type: "Longue distance",
    distance: 1000,
    region: "France Savoie Alpes Europe",
    location: "Savoie Mont-Blanc, France",
    source: "Grande Odyssée",
    reliability: "official",
    surface: "Neige",
    url: "https://www.lagrandeodyssee.com/",
    notes: "Course de traineau multi-étapes dans les Alpes françaises. Janvier 2027."
  }
];

const defaultState = {
  goalKm: 1000,
  goalDate: "2027-01-01",
  seasonMode: "winter",
  unit: "km",
  raceType: "Mid-distance",
  raceName: "",
  raceKm: 100,
  raceDate: "2026-12-15",
  profile: {
    name: "Musher",
    region: "",
    level: "Loisir",
    disciplines: ""
  },
  deviceId: "",
  cloudUpdatedAt: 0,
  hiddenRaceIds: [],
  raceInterests: {},
  openRuns: [
    {
      id: "open-run-demo-jura",
      title: "Canicross tranquille Jura",
      date: "2026-07-04",
      type: "Canicross",
      level: "Tranquille",
      distance: 6,
      location: "Jura",
      notes: "Sortie calme, chiens debutants acceptes, rythme discussion.",
      owner: "MushTrack"
    }
  ],
  openRunJoins: {},
  teamPositions: {},
  agenda: [],
  missingRaceReports: [],
  dogs: [],
  selectedDogIds: [],
  runs: [],
  planWeather: null,
  planWeatherUpdatedAt: null,
  reminders: [],
  lang: "fr"
};

// ── Traductions ──────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  fr: {
    nav_dashboard: "Accueil",
    nav_runs: "Sorties",
    nav_dogs: "Chiens",
    nav_races: "Courses",
    nav_settings: "Paramètres",
    btn_start_run: "Démarrer une sortie",
    btn_add_dog: "Ajouter un chien",
    btn_save: "Enregistrer",
    btn_cancel: "Annuler",
    btn_delete: "Supprimer",
    label_name: "Nom",
    label_distance: "Distance (km)",
    label_duration: "Durée",
    label_date: "Date",
    label_notes: "Notes",
    label_weight: "Poids (kg)",
    label_breed: "Race",
    label_language: "Langue",
    settings_title: "Paramètres",
    runs_title: "Mes sorties",
    dogs_title: "Mes chiens",
    races_title: "Courses",
    race_result_title: "Résultat de course",
    race_rank: "Classement",
    race_participants: "/ Participants",
    race_time: "Temps",
    race_notes: "Note personnelle",
    upcoming: "À venir",
    past: "Passé",
    interested: "Intéressé",
    participating: "Participe"
  },
  en: {
    nav_dashboard: "Home",
    nav_runs: "Runs",
    nav_dogs: "Dogs",
    nav_races: "Races",
    nav_settings: "Settings",
    btn_start_run: "Start a run",
    btn_add_dog: "Add a dog",
    btn_save: "Save",
    btn_cancel: "Cancel",
    btn_delete: "Delete",
    label_name: "Name",
    label_distance: "Distance (km)",
    label_duration: "Duration",
    label_date: "Date",
    label_notes: "Notes",
    label_weight: "Weight (kg)",
    label_breed: "Breed",
    label_language: "Language",
    settings_title: "Settings",
    runs_title: "My runs",
    dogs_title: "My dogs",
    races_title: "Races",
    race_result_title: "Race result",
    race_rank: "Rank",
    race_participants: "/ Participants",
    race_time: "Time",
    race_notes: "Personal note",
    upcoming: "Upcoming",
    past: "Past",
    interested: "Interested",
    participating: "Participating"
  },
  de: {
    nav_dashboard: "Startseite",
    nav_runs: "Ausfahrten",
    nav_dogs: "Hunde",
    nav_races: "Rennen",
    nav_settings: "Einstellungen",
    btn_start_run: "Ausfahrt starten",
    btn_add_dog: "Hund hinzufügen",
    btn_save: "Speichern",
    btn_cancel: "Abbrechen",
    btn_delete: "Löschen",
    label_name: "Name",
    label_distance: "Distanz (km)",
    label_duration: "Dauer",
    label_date: "Datum",
    label_notes: "Notizen",
    label_weight: "Gewicht (kg)",
    label_breed: "Rasse",
    label_language: "Sprache",
    settings_title: "Einstellungen",
    runs_title: "Meine Ausfahrten",
    dogs_title: "Meine Hunde",
    races_title: "Rennen",
    race_result_title: "Rennergebnis",
    race_rank: "Platzierung",
    race_participants: "/ Teilnehmer",
    race_time: "Zeit",
    race_notes: "Persönliche Notiz",
    upcoming: "Bevorstehend",
    past: "Vergangen",
    interested: "Interessiert",
    participating: "Teilnahme"
  }
};

function t(key) {
  const lang = (state && state.lang) || "fr";
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.fr[key] || key;
}

function applyLang() {
  const lang = (state && state.lang) || "fr";
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach(el => {
    const key = el.dataset.t;
    el.textContent = t(key);
  });
  const sel = document.getElementById("lang-select");
  if (sel) sel.value = lang;
}

let state = loadState();
let timer = null;
let watchId = null;
let liveWatchId = null;
let gpsPath = [];
let lastPosition = null;
let map = null;
let marker = null;
let polyline = null;
let seconds = 0;
let distance = 0;
let pendingRunSummary = null;
let planWeatherLoading = false;
let remoteRaceCatalog = [];
let raceRadarLoading = false;
let raceRadarUpdatedAt = "";
let raceRadarStatus = "Catalogue local";
let communityInterests = {};
let communityLoading = false;
let communityLastKey = "";
let communityStatus = "Interets locaux";
let remoteOpenRuns = [];
let openRunCommunityStatus = "Sorties locales";
let openRunLoading = false;

function loadState() {
  const saved = localStorage.getItem("mushtrack-state");
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    // ── Validation des types avant normalisation ──────────────────────
    const repaired = repairStateTypes(parsed);
    return normalizeState({ ...structuredClone(defaultState), ...repaired });
  } catch (err) {
    console.warn("MushTrack: localStorage corrompu, reset vers état par défaut.", err);
    // Badge visible pour prévenir l'utilisateur
    setTimeout(() => showSyncBadge("⚠️ Données locales réinitialisées suite à une erreur"), 1500);
    localStorage.removeItem("mushtrack-state");
    return structuredClone(defaultState);
  }
}

// ── Validation et réparation des types avant normalisation ─────────────
function repairStateTypes(value) {
  if (!value || typeof value !== "object") return {};
  // Arrays obligatoires
  if (!Array.isArray(value.dogs))               value.dogs               = [];
  if (!Array.isArray(value.runs))               value.runs               = [];
  if (!Array.isArray(value.agenda))             value.agenda             = [];
  if (!Array.isArray(value.missingRaceReports)) value.missingRaceReports = [];
  if (!Array.isArray(value.openRuns))           value.openRuns           = [];
  // Objects obligatoires
  if (!value.profile || typeof value.profile !== "object")         value.profile       = {};
  if (!value.raceInterests || typeof value.raceInterests !== "object") value.raceInterests = {};
  if (!value.openRunJoins || typeof value.openRunJoins !== "object")   value.openRunJoins  = {};
  // Valeurs numériques
  if (isNaN(Number(value.goalKm)))  value.goalKm  = 1000;
  if (isNaN(Number(value.raceKm)))  value.raceKm  = 100;
  if (isNaN(Number(value.seasonKm))) value.seasonKm = 0;
  // Strings
  if (typeof value.seasonMode !== "string") value.seasonMode = "winter";
  // Chiens : chaque item doit être un objet avec au moins un id
  value.dogs = value.dogs.filter((d) => d && typeof d === "object" && d.id);
  // Sorties : chaque item doit avoir un km numérique
  value.runs = value.runs.filter((r) => r && typeof r === "object" && !isNaN(Number(r.km)));
  // Agenda : chaque item doit avoir un id et une date
  value.agenda = value.agenda.filter((a) => a && typeof a === "object" && a.id && a.date);
  return value;
}

function normalizeState(value) {
  value.dogs = value.dogs.map((dog, index) => ({
    age: [5, 6, 4, 7, 5, 3][index] || 4,
    birthdate: getApproxBirthdate([5, 6, 4, 7, 5, 3][index] || 4),
    weight: [22, 25, 24, 21, 28, 23][index] || 22,
    status: "Pret",
    harness: "",
    vet: "",
    limitation: "",
    ...dog,
    birthdate: dog.birthdate || getApproxBirthdate(dog.age || [5, 6, 4, 7, 5, 3][index] || 4)
  }));
  value.runs = value.runs.map((run) => ({
    energy: 4,
    recovery: "Bonne",
    paws: true,
    hydrated: true,
    ...run
  }));
  value.raceDate ||= "2026-12-15";
  value.profile = { ...structuredClone(defaultState.profile), ...(value.profile || {}) };
  value.deviceId ||= createDeviceId();
  value.raceInterests ||= {};
  value.openRuns ||= [];
  value.openRunJoins  ||= {};
  value.hiddenRaceIds ||= [];
  value.seasonMode ||= "winter";
  value.agenda ||= structuredClone(defaultState.agenda);
  value.missingRaceReports ||= [];
  value.planWeather ||= null;
  value.planWeatherUpdatedAt ||= null;
  if (!Array.isArray(value.reminders)) value.reminders = [];
  if (!value.lang) value.lang = "fr";
  value.emergencyContact ||= { name: "", phone: "" };
  value.forecast ||= {};
  return value;
}

function getApproxBirthdate(age) {
  const currentYear = new Date().getFullYear();
  return `${currentYear - Number(age || 0)}-01-01`;
}

function getDogAge(dog) {
  if (!dog.birthdate) return Number(dog.age || 0);

  const birth = new Date(`${dog.birthdate}T12:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  if (!hadBirthday) age -= 1;
  return Math.max(0, age);
}

function formatDogBirthdate(value) {
  if (!value) return "Date non renseignee";
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function saveState() {
  localStorage.setItem("mushtrack-state", JSON.stringify(state));
  debouncedSync(); // push vers Supabase si connecté (silencieux)
}

// ── Sync cross-device via Supabase ────────────────────────────────────────────
const SYNC_TABLE = "mushtrack_user_data";
let syncDebounceTimer = null;
let syncBadgeTimer    = null;

// Appelé depuis saveState() — attend 2s d'inactivité avant d'écrire dans le cloud
function debouncedSync() {
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(pushToSupabase, 2000);
}

// ── Queue offline ────────────────────────────────────────────────────────────
const OFFLINE_QUEUE_KEY = "mushtrack-offline-queue";

function getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); } catch { return []; }
}

function saveOfflineQueue(q) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
}

function queueOfflineSync(payload) {
  const q = getOfflineQueue();
  // On garde juste le dernier snapshot (un upsert complet suffit)
  const existing = q.findIndex(op => op.type === "upsert-state");
  if (existing !== -1) q.splice(existing, 1);
  q.push({ type: "upsert-state", payload, ts: Date.now() });
  saveOfflineQueue(q);
  updateOfflineBanner();
}

function updateOfflineBanner() {
  const q = getOfflineQueue();
  let banner = document.getElementById("offline-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#f59e0b;color:#fff;font-size:0.8rem;font-weight:700;text-align:center;padding:6px 12px;display:none";
    document.body.prepend(banner);
  }
  if (!navigator.onLine || q.length > 0) {
    banner.style.display = "block";
    banner.textContent = !navigator.onLine
      ? "📵 Hors ligne — données sauvegardées localement, sync à la reconnexion"
      : `🔄 ${q.length} modification${q.length > 1 ? "s" : ""} en attente de synchronisation...`;
  } else {
    banner.style.display = "none";
  }
}

async function flushOfflineQueue() {
  if (!supabase || !currentUser) return;
  const q = getOfflineQueue();
  if (q.length === 0) return;
  // Prend le snapshot le plus récent (type upsert-state)
  const op = q.filter(o => o.type === "upsert-state").sort((a, b) => b.ts - a.ts)[0];
  if (!op) { saveOfflineQueue([]); updateOfflineBanner(); return; }
  try {
    const { error } = await supabase.from(SYNC_TABLE).upsert(op.payload, { onConflict: "user_id" });
    if (!error) {
      saveOfflineQueue([]);
      updateOfflineBanner();
      console.log("MushTrack: sync différée envoyée ✓");
    }
  } catch (err) {
    console.warn("MushTrack: flush offline queue failed:", err.message);
  }
}

window.addEventListener("online",  () => { updateOfflineBanner(); flushOfflineQueue(); });
window.addEventListener("offline", () => { updateOfflineBanner(); });

// Pousse les données vers Supabase (upsert sur user_id)
async function pushToSupabase() {
  if (!supabase || !currentUser) return;

  const payload = {
    user_id:    currentUser.id,
    dogs:       state.dogs,
    runs:       state.runs,
    agenda:     state.agenda,
    settings: {
      profile:    state.profile,
      raceDate:   state.raceDate,
      raceName:   state.raceName,
      raceType:   state.raceType,
      raceKm:     state.raceKm,
      goalKm:     state.goalKm,
      goalDate:   state.goalDate,
      seasonMode: state.seasonMode
    },
    updated_at: new Date().toISOString()
  };

  if (!navigator.onLine) {
    queueOfflineSync(payload);
    return;
  }

  try {
    state.cloudUpdatedAt = Date.now();
    const { error } = await supabase.from(SYNC_TABLE).upsert(payload, { onConflict: "user_id" });
    if (!error) {
      localStorage.setItem("mushtrack-state", JSON.stringify(state));
      // Si la queue était en attente, on tente de la vider aussi
      if (getOfflineQueue().length > 0) flushOfflineQueue();
    } else {
      queueOfflineSync(payload);
    }
  } catch (err) {
    console.warn("MushTrack sync push failed:", err.message);
    queueOfflineSync(payload);
  }
}

// Tire les données du cloud et les applique si plus récentes que le local
async function syncFromSupabase() {
  if (!supabase || !currentUser) return;
  try {
    const { data, error } = await supabase
      .from(SYNC_TABLE)
      .select("dogs, runs, agenda, settings, updated_at")
      .eq("user_id", currentUser.id)
      .single();

    if (error || !data) return; // Pas encore de données cloud pour cet utilisateur

    const remoteTs = new Date(data.updated_at).getTime();
    const localTs  = state.cloudUpdatedAt || 0;

    // Le cloud est plus récent → on applique ses données
    if (remoteTs > localTs) {
      let changed = false;
      if (Array.isArray(data.dogs)   && data.dogs.length   > 0) { state.dogs   = data.dogs;   changed = true; }
      if (Array.isArray(data.runs)   && data.runs.length   > 0) { state.runs   = data.runs;   changed = true; }
      if (Array.isArray(data.agenda) && data.agenda.length > 0) { state.agenda = data.agenda; changed = true; }
      if (data.settings && typeof data.settings === "object") {
        const s = data.settings;
        if (s.profile)    { state.profile    = s.profile;    changed = true; }
        if (s.raceDate)   { state.raceDate   = s.raceDate;   changed = true; }
        if (s.raceName)   { state.raceName   = s.raceName;   changed = true; }
        if (s.raceType)   { state.raceType   = s.raceType;   changed = true; }
        if (s.raceKm)     { state.raceKm     = s.raceKm;     changed = true; }
        if (s.goalKm)     { state.goalKm     = s.goalKm;     changed = true; }
        if (s.goalDate)   { state.goalDate   = s.goalDate;   changed = true; }
        if (s.seasonMode) { state.seasonMode = s.seasonMode; changed = true; }
      }
      if (changed) {
        state.cloudUpdatedAt = remoteTs;
        localStorage.setItem("mushtrack-state", JSON.stringify(state));
        render();
        showSyncBadge("☁️ Données synchronisées depuis le cloud");
      }
    }
  } catch (err) {
    console.warn("MushTrack sync pull failed:", err.message);
  }
}

// Badge discret en bas de l'écran, disparaît après 3s
function showSyncBadge(message) {
  clearTimeout(syncBadgeTimer);
  let badge = document.querySelector(".sync-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "sync-badge";
    document.querySelector(".phone-shell").appendChild(badge);
  }
  badge.textContent = message;
  badge.classList.add("visible");
  syncBadgeTimer = setTimeout(() => badge.classList.remove("visible"), 3000);
}

function createDeviceId() {
  if (globalThis.crypto?.randomUUID) return `mushtrack-${globalThis.crypto.randomUUID()}`;
  return `mushtrack-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function showScreen(id) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === id);
  });

  bottomButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.go === id);
  });

  render();

  if (id === "record") {
    setTimeout(() => {
      initMap();
      startLiveLocation();
    }, 100);
  }

  if (id === "race") {
    fetchRaceRadar();
  }

  if (id === "agenda") {
    fetchOpenRuns();
  }

  if (id === "coach") {
    updatePlanWeatherIfNeeded();
    renderPlanInsights();
    renderCoach();
  }
  if (id === "community") {
    initCommunity();
  }
}

function getSeasonKm() {
  return state.runs.reduce((sum, run) => sum + Number(run.km), 0);
}

function getWeekKm() {
  return state.runs.slice(0, 2).reduce((sum, run) => sum + Number(run.km), 0);
}

function getAvgSpeed() {
  if (!state.runs.length) return 0;
  return state.runs.reduce((sum, run) => sum + Number(run.speed), 0) / state.runs.length;
}

function daysUntilGoal() {
  const today = new Date();
  const goal = new Date(`${state.goalDate}T12:00:00`);
  return Math.max(1, Math.ceil((goal - today) / 86400000));
}

// ── Dashboard hero ────────────────────────────────────────────
function getTeamReadinessPct() {
  if (state.dogs.length === 0) return null;
  if (state.runs.length === 0) return 0;
  const now = Date.now();
  const runs30 = state.runs.filter(r => r.date && (now - new Date(r.date + "T12:00:00").getTime()) <= 30 * 86400000);
  const targetWeekly = state.raceType === "Sprint" ? 18 : state.raceType === "Longue distance" ? 62 : 38;
  const km30 = runs30.reduce((s, r) => s + Number(r.km || 0), 0);
  const volumeScore = Math.min(1, (targetWeekly * 4) > 0 ? km30 / (targetWeekly * 4) : 0);
  const regulariteScore = Math.min(1, runs30.length / 12);
  const healthyDogs = state.dogs.filter(d => d.healthSignal !== "Attention" && d.healthSignal !== "Repos").length;
  const healthScore = healthyDogs / state.dogs.length;
  const recovMap = { "Excellente": 1, "Bonne": 0.8, "Normale": 0.6, "A surveiller": 0.3, "Difficile": 0.1 };
  const last5 = state.runs.slice(0, 5);
  const recovScore = last5.length > 0 ? last5.reduce((s, r) => s + (recovMap[r.recovery] || 0.6), 0) / last5.length : 0;
  return Math.round((volumeScore * 0.40 + regulariteScore * 0.25 + healthScore * 0.20 + recovScore * 0.15) * 100);
}

function buildHeroSentence(daysLeft, teamPct, workoutTitle) {
  const raceName = state.raceName || state.raceType || "ta course";
  const raceKm   = state.raceKm || "—";
  const parts    = [];
  if (daysLeft !== null && daysLeft > 0) {
    parts.push(`Tu prépares ${raceName} (${raceKm} km) dans <strong>${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong>.`);
  } else if (daysLeft !== null && daysLeft <= 0) {
    parts.push(`La course est passée — mets à jour ton objectif dans Paramètres.`);
  } else {
    parts.push(`Configure ta course objectif dans Paramètres.`);
  }
  if (teamPct !== null) {
    const emoji = teamPct >= 80 ? "🟢" : teamPct >= 50 ? "🟡" : "🔴";
    parts.push(`Attelage prêt à <strong>${teamPct} %</strong> ${emoji}.`);
  }
  parts.push(`Séance recommandée : <strong>${workoutTitle || "endurance"}</strong>.`);
  return parts.join(" ");
}
// ─────────────────────────────────────────────────────────────

function render() {
  const seasonKm = getSeasonKm();
  const remainingKm = Math.max(0, state.goalKm - seasonKm);
  const weeksLeft = Math.max(1, Math.ceil(daysUntilGoal() / 7));
  const weeklyNeed = Math.ceil(remainingKm / weeksLeft);
  const progress = Math.min(100, Math.round((seasonKm / state.goalKm) * 100));

  const isMi = (state.unit || "km") === "mi";
  const distUnit = isMi ? "mi" : "km";
  bindText("seasonKm", isMi ? Math.round(kmToMi(seasonKm)) : Math.round(seasonKm));
  bindText("goalKm", isMi ? Math.round(kmToMi(state.goalKm)) : state.goalKm);
  bindText("goalMessage", `${isMi ? Math.round(kmToMi(remainingKm)) : remainingKm.toFixed(0)} ${distUnit} restants, environ ${isMi ? Math.round(kmToMi(weeklyNeed)) : weeklyNeed} ${distUnit} par semaine.`);
  bindText("weekKm", isMi ? kmToMi(getWeekKm()).toFixed(1) : getWeekKm().toFixed(1));
  bindText("avgSpeed", getAvgSpeed().toFixed(1));
  bindText("runCount", state.runs.length);
  bindText("dogCount", state.dogs.length);
  bindText("raceType", state.raceType);
  bindText("raceKm", isMi ? Math.round(kmToMi(state.raceKm)) : state.raceKm);
  bindText("selectedCount", `${state.selectedDogIds.length} selectionnes`);
  bindText("coachTitle", getCoachInsight().title);
  bindText("coachText", getCoachInsight().text);
  // Compteur "Dernière sortie il y a X jours"
  const lastRunDate = state.runs.length > 0
    ? [...state.runs].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
    : null;
  const lastRunDaysAgo = lastRunDate ? daysUntil(lastRunDate) * -1 : null;
  const lastRunLabel = lastRunDate === null ? "Aucune sortie enregistrée"
    : lastRunDaysAgo === 0 ? "Dernière sortie : aujourd'hui 🟢"
    : lastRunDaysAgo === 1 ? "Dernière sortie : hier 🟢"
    : lastRunDaysAgo <= 4  ? `Dernière sortie il y a ${lastRunDaysAgo} jours 🟡`
    : `Dernière sortie il y a ${lastRunDaysAgo} jours 🔴`;
  bindText("lastRunLabel", lastRunLabel);
  bindText("raceReadiness", getRaceReadiness());

  // ── KPIs dashboard ──────────────────────────────────────────
  const weekKmVal = getWeekKm();
  const targetKmVal = state.raceType === "Sprint" ? 18 : state.raceType === "Longue distance" ? 62 : 38;
  // Progression saison
  const kpiBar = document.querySelector('[data-bind-style="kpiProgressBar"]');
  if (kpiBar) kpiBar.style.width = `${progress}%`;
  bindText("kpiProgress", `${progress} %`);
  // Course objectif
  const daysLeft = state.raceDate ? daysUntil(state.raceDate) : null;
  bindText("kpiDays", daysLeft === null ? "—" : daysLeft === 0 ? "Aujourd'hui !" : `J−${daysLeft}`);
  bindText("kpiRaceName", state.raceName || state.raceType || "—");
  // Attelage
  const teamPct = getTeamReadinessPct();
  if (teamPct !== null) {
    bindText("kpiTeam", `${teamPct} %`);
    bindText("kpiTeamSub", `${state.dogs.length} chien${state.dogs.length > 1 ? "s" : ""} · ${teamPct >= 80 ? "Prêts ✅" : teamPct >= 50 ? "En forme 🟡" : "Surveiller 🔴"}`);
  } else {
    bindText("kpiTeam", "—");
    bindText("kpiTeamSub", "Ajoute tes chiens");
  }
  // Cette semaine
  const weekPct = Math.min(100, Math.round(weekKmVal / targetKmVal * 100));
  bindText("kpiWeek", `${weekKmVal.toFixed(1)} km`);
  bindText("kpiWeekSub", `Objectif : ${targetKmVal} km`);
  bindText("dashWeekPct", `${weekPct} %`);
  const dashWeekBarEl = document.querySelector('[data-bind-style="dashWeekBar"]');
  if (dashWeekBarEl) dashWeekBarEl.style.width = `${weekPct}%`;

  // Phrase hero + image selon saison
  const heroEl = document.querySelector('[data-bind="heroSentence"]');
  if (heroEl) heroEl.innerHTML = buildHeroSentence(daysLeft, teamPct, getNextWorkout().title);
  const heroCard = document.querySelector('.hero-card');
  if (heroCard) heroCard.classList.toggle('summer', state.seasonMode === 'summer');
  const dashHero = document.querySelector('.dash-hero');
  if (dashHero) dashHero.classList.toggle('summer', state.seasonMode === 'summer');

  // Nom utilisateur
  const userName = state.profile?.name || (state.user?.email?.split("@")[0]) || "Musher";
  bindText("dashUserName", userName);

  // Séance du jour — km / durée / intensité / charge
  const wo = getNextWorkout();
  const woKm = wo.km || 5;
  const woTime = Math.round(woKm * (state.raceType === "Sprint" ? 3.5 : state.raceType === "Longue distance" ? 5.5 : 4.5));
  const woLevel = woKm <= 8 ? "Facile" : woKm <= 18 ? "Modéré" : "Difficile";
  const woLoad = Math.min(95, Math.round(woKm * 3.2));
  const woLoadLabel = woLoad < 35 ? "Faible" : woLoad < 65 ? "Modéré" : "Élevé";
  bindText("dashWorkoutKm", `${woKm} km`);
  bindText("dashWorkoutTime", `${woTime} min`);
  bindText("dashWorkoutLevel", woLevel);
  bindText("dashWorkoutLoad", String(woLoad));
  bindText("dashWorkoutLoadLabel", woLoadLabel);
  // Gauge SVG circulaire
  const gaugeEl = document.querySelector(".dash-gauge-ring");
  if (gaugeEl) {
    const r = 36, circ = 2 * Math.PI * r;
    const offset = circ - (woLoad / 100) * circ;
    gaugeEl.style.strokeDasharray = `${circ}`;
    gaugeEl.style.strokeDashoffset = `${offset}`;
    gaugeEl.style.stroke = woLoad < 35 ? "#22c55e" : woLoad < 65 ? "#f59e0b" : "#fc4c02";
  }

  // Résumé équipe
  const teamDogs = (state.selectedDogIds || [])
    .map(id => state.dogs.find(d => d.id === id))
    .filter(Boolean);
  const teamCount = teamDogs.length;
  if (teamCount === 0) {
    bindText("dashDogCount", "Aucun chien");
    bindText("dashDogHealth", "Ajoute tes chiens");
    bindText("dashDogEnergyPct", "—");
    const dogEnergyEl = document.querySelector('[data-bind-style="dashDogEnergy"]');
    if (dogEnergyEl) dogEnergyEl.style.width = "0%";
  } else if (teamCount === 1) {
    const dog = teamDogs[0];
    const sig = dog.healthSignal || "OK";
    const energy = sig === "Attention" ? 45 : sig === "Repos" ? 25 : 82;
    bindText("dashDogCount", dog.name);
    bindText("dashDogHealth", sig === "Attention" ? "Surveiller" : sig === "Repos" ? "Au repos" : "Bonne forme");
    bindText("dashDogEnergyPct", `${energy} %`);
    const dogEnergyEl = document.querySelector('[data-bind-style="dashDogEnergy"]');
    if (dogEnergyEl) dogEnergyEl.style.width = `${energy}%`;
  } else {
    const nbOk = teamDogs.filter(d => !d.healthSignal || d.healthSignal === "OK").length;
    const nbAttention = teamDogs.filter(d => d.healthSignal === "Attention").length;
    const nbRepos = teamDogs.filter(d => d.healthSignal === "Repos").length;
    const energies = teamDogs.map(d => {
      const s = d.healthSignal || "OK";
      return s === "Attention" ? 45 : s === "Repos" ? 25 : 82;
    });
    const avgEnergy = Math.round(energies.reduce((a,b)=>a+b,0) / energies.length);
    bindText("dashDogCount", `${teamCount} chiens`);
    const parts = [];
    if (nbOk > 0) parts.push(`${nbOk} OK`);
    if (nbAttention > 0) parts.push(`${nbAttention} ⚠`);
    if (nbRepos > 0) parts.push(`${nbRepos} repos`);
    bindText("dashDogHealth", parts.join(" · "));
    bindText("dashDogEnergyPct", `${avgEnergy} %`);
    const dogEnergyEl = document.querySelector('[data-bind-style="dashDogEnergy"]');
    if (dogEnergyEl) dogEnergyEl.style.width = `${avgEnergy}%`;
  }

  // Météo
  const wx = typeof state.planWeather === "object" && state.planWeather ? state.planWeather : null;
  if (wx) {
    bindText("dashWeatherTemp", `${Math.round(wx.temperature ?? wx.temp ?? 0)} °C`);
    const wind = wx.windspeed ?? wx.wind ?? 0;
    bindText("dashWeatherWind", `Vent ${wind < 10 ? "faible" : wind < 25 ? "modéré" : "fort"}`);
    const temp = wx.temperature ?? wx.temp ?? 15;
    const groundLabel = temp < -2 ? "Sol enneigé" : temp < 2 ? "Sol gelé" : "Sol sec";
    bindText("dashWeatherGround", groundLabel);
    const condLabel = temp < -5 ? "Froid intense" : temp < 5 ? "Conditions froides" : temp < 20 ? "Conditions idéales" : "Chaud";
    bindText("dashWeatherCond", condLabel);
    bindText("dashWeatherCondClass", temp >= 5 && temp < 20 ? "green" : "orange");
  } else {
    bindText("dashWeatherTemp", "—");
    bindText("dashWeatherWind", "—");
    bindText("dashWeatherGround", "—");
    bindText("dashWeatherCond", "Météo non chargée");
  }

  // Série de jours consécutifs
  const today2 = new Date(); today2.setHours(0,0,0,0);
  let streak = 0;
  if (state.runs?.length) {
    let cursor = new Date(today2);
    const runDays = new Set(state.runs.map(r => {
      const d = new Date(r.date || r.createdAt || Date.now());
      d.setHours(0,0,0,0); return d.toDateString();
    }));
    while (runDays.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate()-1); }
  }
  bindText("dashStreak", `${streak || 0} jours`);
  bindText("dashStreakSub", streak >= 7 ? "Garde le rythme !" : streak >= 3 ? "Belle série !" : streak === 1 ? "C'est parti !" : "Lance-toi !");
  // Render des dots série
  const dotsEl = document.querySelector(".dash-streak-dots");
  if (dotsEl) {
    dotsEl.innerHTML = Array.from({length:7}, (_,i) =>
      `<span class="dash-streak-dot ${i < streak ? "done" : ""}"></span>`
    ).join("");
  }
  // ────────────────────────────────────────────────────────────

  const progressBar = document.querySelector('[data-bind-style="progress"]');
  if (progressBar) progressBar.style.width = `${progress}%`;

  const workout = getNextWorkout();
  document.body.classList.toggle("mode-summer", state.seasonMode === "summer");
  document.body.classList.toggle("mode-winter", state.seasonMode !== "summer");
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.seasonMode);
  });
  bindText("nextWorkoutTitle", workout.title);
  bindText("nextWorkoutText", workout.text);
  bindText("planIntro", getPlanIntro());

  renderDogs();
  renderDogPicker();
  renderSelectedTeam();
  renderTeamSlots();
  renderRuns();
  renderPlan();
  renderAnalytics();
  renderDogProfile();
  renderRaceSearch();
  renderAdminPanel();
  renderAgenda();
  renderOpenRuns();
  renderWebAdvice();
  renderNextRace();
  fillSettingsForm();
  renderProgressChart();
  renderReminders();
}

function bindText(name, value) {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((node) => {
    node.textContent = value;
  });
}

// ── Graphique de progression (km par semaine) ────────────────────────────────
function renderProgressChart() {
  const canvas = document.getElementById("progress-chart");
  const empty  = document.getElementById("chart-empty");
  if (!canvas) return;

  const WEEKS = 10;
  const now   = new Date();

  // Construire tableau des 10 dernières semaines (lundi→dimanche)
  const weeks = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 - w * 7); // lundi
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    weeks.push({ monday, sunday, km: 0, label: `S${WEEKS - w}` });
  }

  // Sommer les km de chaque run dans la bonne semaine
  state.runs.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date + "T12:00:00");
    const wk = weeks.find(w => d >= w.monday && d <= w.sunday);
    if (wk) wk.km += Number(r.km || 0);
  });

  const hasData = weeks.some(w => w.km > 0);
  if (empty) empty.classList.toggle("hidden", hasData);
  canvas.style.display = hasData ? "block" : "none";
  if (!hasData) return;

  const target = state.raceType === "Sprint" ? 18 : state.raceType === "Longue distance" ? 62 : 38;
  const maxKm  = Math.max(...weeks.map(w => w.km), target, 1);

  const dpr  = window.devicePixelRatio || 1;
  const W    = canvas.parentElement.clientWidth || 340;
  const H    = 130;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";

  const ctx  = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const PAD_LEFT = 28, PAD_RIGHT = 8, PAD_TOP = 10, PAD_BOT = 22;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOT;
  const barW   = Math.floor(chartW / WEEKS * 0.55);
  const gap    = chartW / WEEKS;

  // Ligne cible
  const targetY = PAD_TOP + chartH * (1 - target / maxKm);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "#fc4c02";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, targetY);
  ctx.lineTo(W - PAD_RIGHT, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Axe Y — labels
  ctx.fillStyle = "#aaa";
  ctx.font = `${10 * dpr / dpr}px system-ui`;
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(maxKm)}`, PAD_LEFT - 4, PAD_TOP + 4);
  ctx.fillText("0", PAD_LEFT - 4, PAD_TOP + chartH + 2);

  weeks.forEach((wk, i) => {
    const x  = PAD_LEFT + i * gap + (gap - barW) / 2;
    const bh = wk.km > 0 ? Math.max(4, (wk.km / maxKm) * chartH) : 0;
    const y  = PAD_TOP + chartH - bh;
    const isCurrentWeek = i === WEEKS - 1;

    // Barre
    ctx.fillStyle = isCurrentWeek ? "#fc4c02" : (wk.km >= target ? "#2f8f46" : "#c8dff5");
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bh, [3, 3, 0, 0]);
    ctx.fill();

    // Valeur km au-dessus si > 0
    if (wk.km > 0) {
      ctx.fillStyle = isCurrentWeek ? "#fc4c02" : "#666";
      ctx.font = `bold ${9}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(Math.round(wk.km), x + barW / 2, y - 3);
    }

    // Label semaine en bas
    ctx.fillStyle = "#bbb";
    ctx.font = `${9}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(isCurrentWeek ? "Cette sem." : wk.label, x + barW / 2, H - 5);
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Météo GPS (Open-Meteo, sans clé API) ─────────────────────────────────────
const WMO_CODES = {
  0:"Ciel dégagé",1:"Peu nuageux",2:"Partiellement nuageux",3:"Couvert",
  45:"Brouillard",48:"Brouillard givrant",
  51:"Bruine légère",53:"Bruine",55:"Bruine dense",
  61:"Pluie légère",63:"Pluie",65:"Pluie forte",
  71:"Neige légère",73:"Neige",75:"Neige forte",77:"Grésil",
  80:"Averses légères",81:"Averses",82:"Averses fortes",
  85:"Averses de neige",86:"Averses de neige fortes",
  95:"Orage",96:"Orage avec grêle",99:"Orage avec forte grêle"
};
const WMO_ICONS = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"❄️",75:"❄️",77:"🌨️",
  80:"🌦️",81:"🌧️",82:"⛈️",85:"🌨️",86:"❄️",
  95:"⛈️",96:"⛈️",99:"⛈️"
};

async function fetchAndShowWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh`;
    const res  = await fetch(url);
    const data = await res.json();
    const cur  = data.current;
    const code = cur.weather_code;
    const temp = Math.round(cur.temperature_2m);
    const wind = Math.round(cur.wind_speed_10m);
    const desc = WMO_CODES[code] || "—";
    const icon = WMO_ICONS[code] || "🌡️";

    // Affiche la bandelette météo sur l'écran GPS
    const strip = document.getElementById("weather-strip");
    if (strip) {
      document.getElementById("weather-icon").textContent  = icon;
      document.getElementById("weather-temp").textContent  = `${temp}°C`;
      document.getElementById("weather-wind").textContent  = `${wind} km/h`;
      document.getElementById("weather-desc").textContent  = desc;
      strip.classList.remove("hidden");
    }

    // Pré-remplit le champ Météo du bilan de sortie
    const weatherInput = document.getElementById("weather");
    if (weatherInput) weatherInput.value = `${icon} ${temp}°C · ${wind} km/h · ${desc}`;

  } catch {
    // Hors ligne ou API indisponible — pas grave, champ reste vide
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function attachLongPress(element, callback) {
  let pressTimer = null;
  let fired = false;

  const start = (event) => {
    if (event.target.closest("button")) return;
    fired = false;
    pressTimer = setTimeout(() => {
      fired = true;
      callback(event);
    }, 600);
  };
  const cancel = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (!fired) { fired = true; callback(event); }
  });
  element.addEventListener("touchstart", start, { passive: true });
  element.addEventListener("mousedown", start);
  element.addEventListener("touchend", cancel);
  element.addEventListener("touchmove", cancel);
  element.addEventListener("mouseleave", cancel);
  element.addEventListener("mouseup", cancel);
}

function renderDogs() {
  const list = document.querySelector('[data-list="dogs"]');
  if (!list) return;

  list.innerHTML = state.dogs.map((dog) => {
    const load = getDogRecentKm(dog.id);
    const readiness = getDogReadiness(dog);
    const photoHtml = dog.photoDataUrl
      ? `<img src="${dog.photoDataUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #fc4c02" alt="${dog.name}" />`
      : `<img src="assets/dog-placeholder.svg" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="chien" />`;
    return `
    <article class="dog-card ${readiness.level}" data-open-dog="${dog.id}">
      <div style="display:flex;align-items:center;gap:12px">
        ${photoHtml}
        <div>
          <b>${dog.name}</b>
          <span>${dog.role} - ${getDogAge(dog)} ans - ${dog.weight} kg - ${readiness.title}</span>
        </div>
      </div>
      <strong>${Math.round(dog.km)} km</strong>
      <div class="load-meter"><span style="width:${Math.min(100, load * 2)}%"></span></div>
      <small>${load.toFixed(1)} km cette semaine - ${readiness.text}</small>
      <div class="card-actions">
        <button class="secondary-button" data-edit-dog="${dog.id}" type="button">Editer</button>
        <button class="danger-button" data-delete-dog="${dog.id}" type="button">Supprimer</button>
      </div>
    </article>
  `}).join("");

  list.querySelectorAll("[data-open-dog]").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.classList.contains("show-actions")) return;
      activeDogId = card.dataset.openDog;
      showScreen("dog-detail");
    });
    attachLongPress(card, () => {
      document.querySelectorAll(".dog-card.show-actions").forEach(c => c.classList.remove("show-actions"));
      card.classList.add("show-actions");
    });
  });

  list.querySelectorAll("[data-edit-dog]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      editDog(button.dataset.editDog);
    });
  });

  list.querySelectorAll("[data-delete-dog]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteDog(button.dataset.deleteDog);
    });
  });
}

// ── Checklist pré-course ──────────────────────────────────────────────────────
const RACE_CHECKLIST_DEFAULTS = [
  { id: "harnais",    label: "Harnais & traits" },
  { id: "papiers",    label: "Papiers chiens (carnet santé)" },
  { id: "bib",        label: "Dossard / bib" },
  { id: "dropbags",   label: "Dropbags préparés" },
  { id: "nourriture", label: "Nourriture équipe" },
  { id: "eau",        label: "Eau & abreuvoirs" },
  { id: "pharma",     label: "Trousse de secours" },
  { id: "gps",        label: "GPS tracker" },
  { id: "rechange",   label: "Vêtements de rechange" },
  { id: "contact",    label: "Contact vétérinaire de course" }
];

function renderRaceChecklist(item) {
  const checklist = item.checklist || {};
  const customItems = item.customChecklist || [];
  const allItems = [...RACE_CHECKLIST_DEFAULTS, ...customItems];
  const done = allItems.filter(c => checklist[c.id] || c.checked).length;
  const total = allItems.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return `
  <div class="race-checklist-wrap" id="checklist-wrap-${item.id}" style="display:none;margin-top:12px;padding:14px;background:#f8f7ff;border-radius:12px;border:1.5px solid #6366f1">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <p style="margin:0;font-size:0.78rem;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.05em">☑️ Checklist pré-course</p>
      <span style="font-size:0.8rem;font-weight:700;color:${allDone ? "#22c55e" : "#6366f1"}">${done}/${total} ${allDone ? "✅" : ""}</span>
    </div>
    <div style="background:#e8e7ff;border-radius:4px;height:4px;margin-bottom:12px">
      <div style="background:#6366f1;height:4px;border-radius:4px;width:${pct}%;transition:width .3s"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${allItems.map(c => {
        const checked = checklist[c.id] || c.checked || false;
        return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:6px 8px;border-radius:8px;background:${checked ? "#eefdf3" : "#fff"};border:1px solid ${checked ? "#bbf7d0" : "#e5e5e5"}">
          <input type="checkbox" data-checklist-item="${item.id}" data-checklist-key="${c.id}" ${checked ? "checked" : ""} style="accent-color:#6366f1;width:16px;height:16px;flex-shrink:0"/>
          <span style="font-size:0.88rem;color:${checked ? "#16a34a" : "#333"};${checked ? "text-decoration:line-through;opacity:0.7" : ""}">${c.label}</span>
        </label>`;
      }).join("")}
    </div>
    <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:0.82rem;color:#888">
      <input id="checklist-custom-${item.id}" type="text" placeholder="+ Ajouter un élément..." style="flex:1;padding:7px 10px;border:1px solid #ddd;border-radius:8px;font-size:0.85rem"/>
      <button data-checklist-add="${item.id}" type="button" style="padding:7px 12px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.85rem">+</button>
    </label>
  </div>`;
}

function drawWeightChart(dog) {
  const canvas = document.getElementById(`weight-chart-${dog.id}`);
  if (!canvas) return;
  const history = (dog.weightHistory || []).slice(-20);
  if (history.length < 2) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#f9f9f9";
  ctx.fillRect(0, 0, W, H);

  const weights = history.map(h => h.weight);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const range = maxW - minW || 1;

  const toX = i => pad.left + (i / (history.length - 1)) * cW;
  const toY = w => pad.top + cH - ((w - minW) / range) * cH;

  // Grille
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * cH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    const val = (maxW - (i / 4) * range).toFixed(1);
    ctx.fillStyle = "#aaa"; ctx.font = "20px system-ui"; ctx.textAlign = "right";
    ctx.fillText(val + " kg", pad.left - 6, y + 7);
  }

  // Zone sous la courbe
  ctx.beginPath();
  history.forEach((h, i) => {
    i === 0 ? ctx.moveTo(toX(i), toY(h.weight)) : ctx.lineTo(toX(i), toY(h.weight));
  });
  ctx.lineTo(toX(history.length - 1), pad.top + cH);
  ctx.lineTo(toX(0), pad.top + cH);
  ctx.closePath();
  ctx.fillStyle = "rgba(252,76,2,0.08)";
  ctx.fill();

  // Courbe
  ctx.beginPath();
  history.forEach((h, i) => {
    i === 0 ? ctx.moveTo(toX(i), toY(h.weight)) : ctx.lineTo(toX(i), toY(h.weight));
  });
  ctx.strokeStyle = "#fc4c02";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Points + dates
  history.forEach((h, i) => {
    const x = toX(i), y = toY(h.weight);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fc4c02"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();

    // Date (première, dernière, et tous les 4)
    if (i === 0 || i === history.length - 1 || i % 4 === 0) {
      const label = h.date.slice(5); // MM-DD
      ctx.fillStyle = "#999"; ctx.font = "18px system-ui"; ctx.textAlign = "center";
      ctx.fillText(label, x, pad.top + cH + 24);
    }
  });

  // Valeur courante
  const last = history[history.length - 1];
  ctx.fillStyle = "#fc4c02"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "left";
  ctx.fillText(last.weight + " kg", toX(history.length - 1) - 50, toY(last.weight) - 10);
}

function buildWeightSparkline(dog) {
  const history = (dog.weightHistory || []).slice(-12); // 12 derniers points max
  const current = dog.weight || 0;
  if (history.length < 2) {
    return `<span>Poids</span><b>${current} kg</b><small style="color:#aaa;font-size:0.72rem;display:block">Modifie le poids pour voir l'évolution</small>`;
  }
  const weights = history.map((h) => h.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const W = 100; const H = 32; const pad = 4;
  const points = weights.map((w, i) => {
    const x = pad + (i / (weights.length - 1)) * (W - pad * 2);
    const y = H - pad - ((w - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const trend = weights[weights.length - 1] - weights[0];
  const trendIcon = trend > 0.5 ? "↑" : trend < -0.5 ? "↓" : "→";
  const trendColor = trend > 0.5 ? "#fc4c02" : trend < -0.5 ? "#3b82f6" : "#888";
  return `
    <span>Poids</span>
    <b>${current} kg <span style="color:${trendColor};font-size:0.8em">${trendIcon} ${Math.abs(trend).toFixed(1)} kg</span></b>
    <svg viewBox="0 0 ${W} ${H}" width="100" height="32" style="display:block;margin-top:4px">
      <polyline points="${points}" fill="none" stroke="#fc4c02" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      ${weights.map((w, i) => {
        const x = pad + (i / (weights.length - 1)) * (W - pad * 2);
        const y = H - pad - ((w - min) / range) * (H - pad * 2);
        return i === weights.length - 1 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#fc4c02"/>` : "";
      }).join("")}
    </svg>
    <small style="color:#aaa;font-size:0.68rem">${history[0].date} → ${history[history.length-1].date}</small>
  `;
}

function renderDogProfile() {
  const list = document.querySelector('[data-list="dogProfile"]');
  if (!list) return;
  const dog = state.dogs.find((item) => item.id === activeDogId) || state.dogs[0];
  if (!dog) return;
  activeDogId = dog.id;
  bindText("detailDogName", dog.name);

  const runs = state.runs.filter((run) => run.team.includes(dog.id));
  const lastRun = runs[0];
  const recentKm  = getDogRecentKm(dog.id, 7);
  const km30      = getDogRecentKm(dog.id, 30);
  const fatigue   = getDogFatigueIndex(dog.id);
  const daysSinceRest = getDogDaysSinceRest(dog.id);
  const avgEnergy = runs.length ? runs.reduce((s, r) => s + Number(r.energy || 4), 0) / runs.length : 0;
  const health    = getDogHealthSignal(dog, runs, recentKm, avgEnergy);
  const lastRecovery = lastRun ? lastRun.recovery : "Aucune sortie";
  const pawStatus    = lastRun ? (lastRun.paws ? "OK" : "À vérifier") : "Non noté";
  const recentNotes  = runs.filter(r => r.notes).slice(0, 2)
    .map(r => `${formatDate(r.date)} : ${r.notes}`).join("<br>") || "Aucune note récente.";

  const fatigueLabel = fatigue < 0.6 ? "Faible" : fatigue < 1.0 ? "Normal" : fatigue < 1.4 ? "Élevé" : "Très élevé";
  const fatigueColor = fatigue < 0.6 ? "#888" : fatigue < 1.0 ? "#2f8f46" : fatigue < 1.4 ? "#e8a020" : "#d94040";
  const formEmoji    = health.level === "danger" ? "🔴" : health.level === "warning" ? "🟡" : "🟢";

  const healthHistory = Array.isArray(dog.healthHistory) ? dog.healthHistory : [];
  const healthIcons   = { blessure:"🤕", veto:"🏥", traitement:"💊", repos:"😴", vaccin:"💉", vermifuge:"🐛", autre:"📌" };

  // Prochains rappels (vaccin/vermifuge avec nextDue)
  const upcomingReminders = healthHistory.filter(e =>
    e.nextDue && (e.type === "vaccin" || e.type === "vermifuge")
  ).map(e => {
    const due  = new Date(e.nextDue + "T12:00:00");
    const days = Math.round((due - Date.now()) / 86400000);
    return { ...e, days };
  }).filter(e => e.days <= 60).sort((a, b) => a.days - b.days);

  list.innerHTML = `
    <article class="profile-hero" style="position:relative">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          ${dog.photoDataUrl
            ? `<img src="${dog.photoDataUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;border:3px solid rgba(255,255,255,0.4)" alt="${dog.name}" />`
            : `<img src="assets/dog-placeholder.svg" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;border:3px solid rgba(255,255,255,0.4)" alt="chien" />`}
          <div>
            <span>${dog.role}</span>
            <strong>${Math.round(dog.km)} km saison</strong>
            <p>${dog.note || "Aucune note pour ce chien."}</p>
          </div>
        </div>
        <div style="text-align:center;flex-shrink:0;font-size:2rem;line-height:1">${formEmoji}
          <div style="font-size:0.7rem;font-weight:700;color:rgba(255,255,255,0.8);margin-top:4px">${health.title}</div>
        </div>
      </div>
    </article>

    <!-- Charge individuelle -->
    <div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:10px;border:1px solid #f0f0f0;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
      <p style="font-size:0.7rem;text-transform:uppercase;letter-spacing:.06em;color:#999;font-weight:700;margin:0 0 12px">Charge individuelle</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:#1a1a1a">${recentKm.toFixed(0)} km</div>
          <div style="font-size:0.7rem;color:#999">7 jours</div>
        </div>
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:#1a1a1a">${km30.toFixed(0)} km</div>
          <div style="font-size:0.7rem;color:#999">30 jours</div>
        </div>
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:${fatigueColor}">${fatigueLabel}</div>
          <div style="font-size:0.7rem;color:#999">Fatigue</div>
        </div>
      </div>
      ${daysSinceRest !== null
        ? `<p style="font-size:0.78rem;color:#888;margin:10px 0 0;text-align:center">Dernière bonne récupération il y a ${daysSinceRest} jour${daysSinceRest > 1 ? "s" : ""}</p>`
        : ""}
    </div>

    <section class="profile-grid">
      <article><span>Naissance</span><b>${formatDogBirthdate(dog.birthdate)}</b></article>
      <article><span>Âge</span><b>${getDogAge(dog)} ans</b></article>
      <article>${buildWeightSparkline(dog)}</article>
      <article><span>Énergie moy.</span><b>${avgEnergy ? avgEnergy.toFixed(1) : "—"}/5</b></article>
      <article><span>Récupération</span><b>${lastRecovery}</b></article>
      <article><span>Harnais</span><b>${dog.harness || "À noter"}</b></article>
    </section>

    <section class="dog-health-grid">
      <article class="dog-health ${health.level}">
        <span>État du jour</span>
        <b>${health.title}</b>
        <p>${health.text}</p>
      </article>
      <article>
        <span>Carnet santé</span>
        <b>Pattes ${pawStatus}</b>
        <p>${recentNotes}</p>
      </article>
      <article class="${dog.limitation ? "danger" : ""}">
        <span>Point de vigilance</span>
        <b>${dog.limitation || "Rien de particulier"}</b>
        <p>${dog.vet ? `Suivi véto : ${dog.vet}` : "Ajoute les infos véto, blessures ou repos."}</p>
      </article>
    </section>

    <!-- Graphique poids -->
    ${(dog.weightHistory || []).length >= 2 ? `
    <div style="margin-bottom:18px">
      <p style="font-size:0.7rem;text-transform:uppercase;letter-spacing:.06em;color:#999;font-weight:700;margin:0 0 8px">Évolution du poids</p>
      <canvas id="weight-chart-${dog.id}" width="800" height="160" style="width:100%;border-radius:12px;background:#f9f9f9"></canvas>
    </div>` : ""}

    <!-- Historique santé -->
    <div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <p style="font-size:0.7rem;text-transform:uppercase;letter-spacing:.06em;color:#999;font-weight:700;margin:0">Historique santé</p>
        <button type="button" id="add-health-event-btn" style="font-size:0.78rem;color:#fc4c02;background:none;border:none;font-weight:700;cursor:pointer">+ Ajouter</button>
      </div>
      ${upcomingReminders.length > 0 ? `
      <div class="vet-reminders">
        ${upcomingReminders.map(e => `
          <div class="vet-reminder ${e.days < 0 ? "overdue" : e.days <= 14 ? "urgent" : ""}">
            <span>${healthIcons[e.type]}</span>
            <div>
              <strong>${e.type === "vaccin" ? "Vaccin" : "Vermifuge"} — ${e.notes || ""}</strong>
              <small>${e.days < 0 ? `En retard de ${Math.abs(e.days)} j` : e.days === 0 ? "Aujourd'hui !" : `Dans ${e.days} jour${e.days > 1 ? "s" : ""}`}</small>
            </div>
          </div>`).join("")}
      </div>` : ""}
      <form id="health-event-form" style="display:none;flex-direction:column;gap:8px;background:#fff;border-radius:12px;padding:14px;border:1px solid #f0f0f0;margin-bottom:8px">
        <select id="health-event-type" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem">
          <option value="vaccin">💉 Vaccin</option>
          <option value="vermifuge">🐛 Vermifuge</option>
          <option value="veto">🏥 Visite vétérinaire</option>
          <option value="blessure">🤕 Blessure</option>
          <option value="traitement">💊 Traitement</option>
          <option value="repos">😴 Repos imposé</option>
          <option value="autre">📌 Autre</option>
        </select>
        <input id="health-event-date" type="date" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem" />
        <textarea id="health-event-notes" placeholder="Description (ex: Rage + Parvo, Dr Martin...)" rows="2" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem;resize:none"></textarea>
        <label id="health-next-due-wrap" style="display:flex;flex-direction:column;gap:4px;font-size:0.82rem;color:#666;font-weight:600">
          Prochain rappel
          <input id="health-event-next-due" type="date" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem;font-weight:400" />
        </label>
        <div style="display:flex;gap:8px">
          <button type="submit" style="flex:1;padding:9px;background:#fc4c02;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">Enregistrer</button>
          <button type="button" id="health-event-cancel" style="flex:1;padding:9px;background:#f5f5f5;border:none;border-radius:8px;cursor:pointer">Annuler</button>
        </div>
      </form>
      ${healthHistory.length === 0
        ? `<p style="font-size:0.82rem;color:#aaa;text-align:center;padding:12px">Aucun événement enregistré.</p>`
        : healthHistory.slice().reverse().map((evt, i) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:#fff;border-radius:10px;border:1px solid #f0f0f0;margin-bottom:6px">
            <span style="font-size:1.2rem">${healthIcons[evt.type] || "📌"}</span>
            <div style="flex:1">
              <div style="font-size:0.8rem;color:#999">${evt.date ? formatFullDate(evt.date) : "—"}</div>
              <div style="font-size:0.88rem;font-weight:600;color:#333">${evt.notes || evt.type}</div>
            </div>
            <button type="button" data-delete-health="${healthHistory.length - 1 - i}" style="background:none;border:none;color:#ccc;font-size:0.9rem;cursor:pointer">✕</button>
          </div>`).join("")
      }
    </div>

    <article class="advice-card ${recentKm > 45 ? "important" : ""}">
      <span>Coach</span>
      <h2>${recentKm > 45 ? "Charge haute" : "Charge correcte"}</h2>
      <p>${getDogAdvice(dog, recentKm, lastRun)}</p>
    </article>

    <section class="run-list">
      ${runs.slice(0, 4).map((run) => `
        <article>
          <div>
            <b>${run.type}</b>
            <span>${formatDate(run.date)} · ${run.recovery} · énergie ${run.energy}/5</span>
          </div>
          <strong>${Number(run.km).toFixed(1)} km</strong>
        </article>
      `).join("") || `<p class="empty-state">Pas encore de sortie pour ${dog.name}.</p>`}
    </section>
  `;

  // Graphique poids
  drawWeightChart(dog);

  // Bouton + Ajouter événement santé
  const addBtn = list.querySelector("#add-health-event-btn");
  const healthForm = list.querySelector("#health-event-form");
  const nextDueWrap = list.querySelector("#health-next-due-wrap");
  const typeSelect  = list.querySelector("#health-event-type");

  function toggleNextDue() {
    const needsRecall = typeSelect?.value === "vaccin" || typeSelect?.value === "vermifuge";
    if (nextDueWrap) nextDueWrap.style.display = needsRecall ? "flex" : "none";
  }
  typeSelect?.addEventListener("change", toggleNextDue);
  toggleNextDue();

  addBtn?.addEventListener("click", () => {
    healthForm.style.display = healthForm.style.display === "none" ? "flex" : "none";
    if (healthForm.style.display !== "none") {
      list.querySelector("#health-event-date").value = new Date().toISOString().slice(0, 10);
      toggleNextDue();
    }
  });
  list.querySelector("#health-event-cancel")?.addEventListener("click", () => {
    healthForm.style.display = "none";
  });
  healthForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const dogIdx = state.dogs.findIndex(d => d.id === dog.id);
    if (dogIdx === -1) return;
    if (!Array.isArray(state.dogs[dogIdx].healthHistory)) state.dogs[dogIdx].healthHistory = [];
    const type    = list.querySelector("#health-event-type").value;
    const nextDue = list.querySelector("#health-event-next-due").value || null;
    state.dogs[dogIdx].healthHistory.push({
      type,
      date:    list.querySelector("#health-event-date").value,
      notes:   list.querySelector("#health-event-notes").value.trim(),
      ...(nextDue ? { nextDue } : {})
    });
    saveState();
    renderDogProfile();
  });

  // Supprimer événement santé
  list.querySelectorAll("[data-delete-health]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.deleteHealth);
      const dogIdx = state.dogs.findIndex(d => d.id === dog.id);
      if (dogIdx === -1) return;
      state.dogs[dogIdx].healthHistory = (state.dogs[dogIdx].healthHistory || []).filter((_, i) => i !== idx);
      saveState();
      renderDogProfile();
    });
  });
}

function renderDogPicker() {
  document.querySelectorAll('[data-list="dogPicker"]').forEach(list => {
    list.innerHTML = state.dogs.map((dog) => {
      const selected = state.selectedDogIds.includes(dog.id);
      return `<button class="${selected ? "selected" : ""}" data-dog-id="${dog.id}">${dog.name}</button>`;
    }).join("");

    list.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => toggleDogSelection(button.dataset.dogId));
    });
  });
}

function editDog(id) {
  const dog = state.dogs.find((item) => item.id === id);
  if (!dog) return;

  editingDogId = id;
  dogForm.classList.remove("hidden");
  document.querySelector("#dog-name").value = dog.name;
  document.querySelector("#dog-role").value = dog.role;
  document.querySelector("#dog-birthdate").value = dog.birthdate || "";
  document.querySelector("#dog-weight").value = dog.weight;
  document.querySelector("#dog-harness").value = dog.harness || "";
  document.querySelector("#dog-vet").value = dog.vet || "";
  document.querySelector("#dog-limitation").value = dog.limitation || "";
  document.querySelector("#dog-note").value = dog.note || "";
  dogSubmitButton.textContent = "Enregistrer";
  // Pré-remplir la photo existante
  currentDogPhotoDataUrl = dog.photoDataUrl || null;
  const preview = document.getElementById("dog-photo-preview");
  if (preview) {
    if (dog.photoDataUrl) {
      preview.innerHTML = `<img src="${dog.photoDataUrl}" style="width:100%;height:100%;object-fit:cover" />`;
      preview.style.border = "2px solid #fc4c02";
    } else {
      preview.innerHTML = "🐕";
      preview.style.background = "#f0f0f0";
      preview.style.border = "2px dashed #ddd";
    }
  }
  dogForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteDog(id) {
  const dog = state.dogs.find((item) => item.id === id);
  if (!dog || !confirm(`Supprimer ${dog.name} ?`)) return;

  state.dogs = state.dogs.filter((item) => item.id !== id);
  state.selectedDogIds = state.selectedDogIds.filter((dogId) => dogId !== id);
  if (activeDogId === id) activeDogId = null;
  if (editingDogId === id) editingDogId = null;
  saveState();
  render();
}

function resetDogForm() {
  editingDogId = null;
  dogForm.reset();
  dogSubmitButton.textContent = "Ajouter";
  dogForm.classList.add("hidden");
}

function renderSelectedTeam() {
  const list = document.querySelector('[data-list="selectedTeam"]');
  if (!list) return;

  const dogs = state.dogs.filter((dog) => state.selectedDogIds.includes(dog.id));
  list.innerHTML = dogs.length
    ? dogs.map((dog) => `<span class="chip">${dog.name}</span>`).join("")
    : `<p class="empty-state">Appuie sur Modifier ✏️ pour sélectionner tes chiens.</p>`;
}

function renderTeamSlots() {
  renderSledDiagram();
}

// ── Schéma attelage drag & drop ───────────────────────────────
let _dragDogId   = null;
let _dragFromSlot = null;

// Génère les paires [clé, label] pour n chiens sélectionnés
function getSledPositions(dogCount) {
  const pairs = Math.max(1, Math.ceil(dogCount / 2));
  if (pairs === 1) return [["leader","Leader"]];
  if (pairs === 2) return [["leader","Leader"],["wheel","Wheel"]];
  const list = [["leader","Leader"],["swing","Swing"]];
  for (let i = 2; i < pairs - 1; i++) list.push([`team${i-1}`, `Team ${i-1}`]);
  list.push(["wheel","Wheel"]);
  return list;
}

function renderSledDiagram() {
  const containers = document.querySelectorAll(".sled-diagram");
  if (!containers.length) return;
  if (!state.teamPositions) state.teamPositions = {};

  const selectedCount = (state.selectedDogIds || []).length;

  // Génère les clés et labels selon le nombre de paires
  function getPositions() { return getSledPositions(selectedCount); }

  // Nettoyer les slots obsolètes et réassigner les chiens orphelins
  const orderedSlots = getPositions().flatMap(([k]) => [`${k}-l`, `${k}-r`]);
  const validSlots = new Set(orderedSlots);
  Object.keys(state.teamPositions).forEach(slot => {
    if (!validSlots.has(slot)) delete state.teamPositions[slot];
  });
  const assigned = new Set(Object.values(state.teamPositions));
  (state.selectedDogIds || []).forEach(id => {
    if (!assigned.has(id)) {
      const free = orderedSlots.find(s => !state.teamPositions[s]);
      if (free) { state.teamPositions[free] = id; assigned.add(id); }
    }
  });

  function dogInSlot(key, side) {
    const id = state.teamPositions[`${key}-${side}`];
    return id ? state.dogs.find(d => d.id === id) : null;
  }

  function formEmoji(dog) {
    if (!dog) return "";
    const signal = dog.healthSignal || "";
    return signal === "Attention" || signal === "Repos" ? "🔴" : "🟢";
  }

  function buildHTML() {
    const rows = getPositions().map(([key, label]) => {
      const left  = dogInSlot(key, "l");
      const right = dogInSlot(key, "r");
      const slotL = `${key}-l`, slotR = `${key}-r`;
      const makeSlot = (dog, slot) => {
        const occupied = !!dog;
        return `<div class="sled-slot ${occupied?"filled":"empty"}" data-slot="${slot}"
               ondragover="if(!${occupied})event.preventDefault();${occupied}?void 0:this.classList.add('drag-over')"
               ondragleave="this.classList.remove('drag-over')"
               ondrop="handleSlotDrop(event,'${slot}')">
            ${dog
              ? `<span class="sled-dog" draggable="true" ondragstart="handleDogDragStart(event,'${dog.id}','${slot}')">${formEmoji(dog)} ${dog.name}<button type="button" class="sled-remove" onclick="removeFromSlot('${slot}')">✕</button></span>`
              : `<span class="sled-empty-label">+</span>`}
          </div>`;
      };
      return `<div class="sled-row">${makeSlot(left,slotL)}<div class="sled-position-label">${label}</div>${makeSlot(right,slotR)}</div>`;
    }).join("");
    return `<div class="sled-schema">${rows}</div>`;
  }

  containers.forEach(container => {
    container.innerHTML = buildHTML();

    // Touch drag (mobile)
    let touchDogId = null, touchFromSlot = null, touchClone = null, touchHoverSlot = null;

    container.querySelectorAll(".sled-dog[draggable='true']").forEach(dogEl => {
      dogEl.addEventListener("touchstart", e => {
        const slot = dogEl.closest("[data-slot]");
        touchFromSlot = slot ? slot.dataset.slot : null;
        touchDogId = touchFromSlot ? state.teamPositions[touchFromSlot] : null;
        touchHoverSlot = null;
        touchClone = dogEl.cloneNode(true);
        touchClone.style.cssText = "position:fixed;opacity:.75;pointer-events:none;z-index:9999;font-size:0.85rem;background:#fc4c02;color:#fff;padding:6px 10px;border-radius:8px;transform:translate(-50%,-50%)";
        document.body.appendChild(touchClone);
      }, { passive: true });

      dogEl.addEventListener("touchmove", e => {
        if (!touchClone) return;
        const t = e.touches[0];
        touchClone.style.left = t.clientX + "px";
        touchClone.style.top  = t.clientY + "px";
        // Détecter le slot sous le doigt en masquant le clone
        touchClone.style.visibility = "hidden";
        const under = document.elementFromPoint(t.clientX, t.clientY);
        touchClone.style.visibility = "visible";
        touchHoverSlot = under?.closest("[data-slot]")?.dataset?.slot || null;
        e.preventDefault();
      }, { passive: false });

      dogEl.addEventListener("touchend", e => {
        if (touchClone) { touchClone.remove(); touchClone = null; }
        const toSlot = touchHoverSlot;
        touchHoverSlot = null;
        if (toSlot && touchDogId && toSlot !== touchFromSlot) {
          const occupant = state.teamPositions[toSlot];
          if (touchFromSlot) {
            if (occupant) state.teamPositions[touchFromSlot] = occupant;
            else delete state.teamPositions[touchFromSlot];
          }
          state.teamPositions[toSlot] = touchDogId;
          saveState();
          renderSledDiagram();
        }
        touchDogId = null; touchFromSlot = null;
      });
    });
  });
}

function handleDogDragStart(event, dogId, fromSlot) {
  _dragDogId    = dogId;
  _dragFromSlot = fromSlot || null;
  event.dataTransfer.setData("text/plain", dogId);
}

function handleSlotDrop(event, toSlot) {
  event.preventDefault();
  document.querySelectorAll(".sled-slot").forEach(s => s.classList.remove("drag-over"));
  const dogId = _dragDogId || event.dataTransfer.getData("text/plain");
  if (!dogId) return;
  if (!state.teamPositions) state.teamPositions = {};
  // Inverser si l'emplacement cible est occupé
  const occupant = state.teamPositions[toSlot];
  if (_dragFromSlot) {
    if (occupant && occupant !== dogId) state.teamPositions[_dragFromSlot] = occupant;
    else delete state.teamPositions[_dragFromSlot];
  }
  state.teamPositions[toSlot] = dogId;
  _dragDogId = null; _dragFromSlot = null;
  // Met à jour le rôle du chien
  const roleMap = { leader:"Leader", swing:"Swing", team:"Team", wheel:"Wheel" };
  const posKey  = toSlot.split("-")[0];
  const dogIdx  = state.dogs.findIndex(d => d.id === dogId);
  if (dogIdx !== -1) state.dogs[dogIdx].role = roleMap[posKey] || state.dogs[dogIdx].role;
  saveState();
  renderSledDiagram();
}

function removeFromSlot(slot) {
  if (!state.teamPositions) return;
  delete state.teamPositions[slot];
  saveState();
  renderSledDiagram();
}
// ─────────────────────────────────────────────────────────────

function renderRuns() {
  const runsHtml = state.runs.map((run, index) => {
    const teamNames = run.team.map((id) => state.dogs.find((dog) => dog.id === id)?.name).filter(Boolean).join(", ");
    const hasTrace = Array.isArray(run.path) && run.path.length > 1;
    const km = Number(run.km).toFixed(1);
    const speed = Number(run.avgSpeed || 0).toFixed(1);
    const dur = run.duration ? formatDuration(run.duration) : "--:--";
    const paceMin = (run.avgSpeed && run.avgSpeed > 0) ? Math.floor(60 / run.avgSpeed) : null;
    const paceSec = (run.avgSpeed && run.avgSpeed > 0) ? Math.round((60 / run.avgSpeed - Math.floor(60 / run.avgSpeed)) * 60) : null;
    const paceStr = paceMin !== null ? `${paceMin}:${String(paceSec).padStart(2,'0')}` : "--:--";
    return `
      <article class="run-card" data-run-index="${index}">
        <div class="run-card-header">
          <div class="run-card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>
          </div>
          <div class="run-card-meta">
            <div class="run-card-title">${run.type}</div>
            <div class="run-card-date">${formatDate(run.date)}${teamNames ? " · " + teamNames : ""}</div>
          </div>
          <button class="strava-run-menu" data-run-option="${index}" type="button" title="Modifier">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
        </div>
        ${hasTrace ? renderRoutePreview(run.path) : ""}
        <div class="run-card-stats">
          <div class="run-stat">
            <span class="run-stat-value">${km}</span>
            <span class="run-stat-label">km</span>
          </div>
          <div class="run-stat">
            <span class="run-stat-value">${dur}</span>
            <span class="run-stat-label">Durée</span>
          </div>
          <div class="run-stat">
            <span class="run-stat-value">${paceStr}</span>
            <span class="run-stat-label">min/km</span>
          </div>
        </div>
        <div class="run-details">
          <span>Vitesse ${speed} km/h</span>
          <span>Énergie ${run.energy || "-"}/5</span>
          <span>Pattes ${run.paws ? "OK" : "à vérifier"}</span>
          <span>Hydratation ${run.hydrated ? "OK" : "à renforcer"}</span>
          <p>${run.notes || "Aucune note ajoutée."}</p>
          <div class="card-actions">
            <button class="secondary-button" data-run-option="${index}" type="button">Modifier</button>
            <button class="danger-button" data-delete-run="${index}" type="button">Supprimer</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll('[data-list="runs"]').forEach((list) => {
    list.innerHTML = runsHtml || `<p class="empty-state">Aucune sortie enregistree.</p>`;

    list.querySelectorAll("[data-run-index]").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        openRunDetail(Number(card.dataset.runIndex));
      });
      attachLongPress(card, () => {
        document.querySelectorAll(".dog-card.show-actions").forEach(c => c.classList.remove("show-actions"));
        card.classList.add("show-actions");
      });
    });

    list.querySelectorAll("[data-run-option]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const card = button.closest(".run-card");
        if (card) card.classList.toggle("show-details");
      });
    });

    list.querySelectorAll("[data-delete-run]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteRun(Number(button.dataset.deleteRun));
      });
    });
  });
}

function renderRoutePreview(path) {
  const points = path
    .map((point) => Array.isArray(point) ? point : [point.lat, point.lon ?? point.lng])
    .filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)));
  if (points.length < 2) return `<div class="route-preview empty">Trace GPS trop courte</div>`;

  const lats = points.map(([lat]) => Number(lat));
  const lngs = points.map(([, lng]) => Number(lng));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;
  const svgPoints = points.map(([lat, lng]) => {
    const x = 8 + ((Number(lng) - minLng) / lngRange) * 84;
    const y = 52 - ((Number(lat) - minLat) / latRange) * 44;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const firstPoint = svgPoints[0].split(",");
  const lastPoint = svgPoints[svgPoints.length - 1].split(",");

  return `
    <div class="route-preview" aria-label="Trace GPS miniature">
      <svg viewBox="0 0 100 60" role="img">
        <path d="M8 52 L92 8" opacity="0.08"></path>
        <polyline points="${svgPoints.join(" ")}"></polyline>
        <circle cx="${firstPoint[0]}" cy="${firstPoint[1]}" r="2.2"></circle>
        <circle class="finish" cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="2.6"></circle>
      </svg>
    </div>
  `;
}

function renderAnalytics() {
  renderWeeklyChart();
  renderTeamHealth();
  renderDogLoads();
  renderAlerts();
}

function renderTeamHealth() {
  const list = document.querySelector('[data-list="teamHealth"]');
  if (!list) return;

  const dogs = state.dogs.map((dog) => ({ dog, readiness: getDogReadiness(dog), load: getDogRecentKm(dog.id) }));
  const readyCount = dogs.filter((item) => item.readiness.level === "ok").length;
  const watchCount = dogs.filter((item) => item.readiness.level === "light").length;
  const restCount = dogs.filter((item) => item.readiness.level === "danger").length;
  const selectedRisks = dogs.filter((item) => state.selectedDogIds.includes(item.dog.id) && item.readiness.level !== "ok");
  const decision = selectedRisks.length
    ? `Attention attelage : ${selectedRisks.map((item) => item.dog.name).join(", ")} a surveiller.`
    : "Attelage du jour coherent si la meteo reste favorable.";

  list.innerHTML = `
    <article class="health-summary">
      <span>Decision coach</span>
      <b>${decision}</b>
      <p>${readyCount} pret(s), ${watchCount} a doser, ${restCount} repos/surveillance.</p>
    </article>
    <section class="health-grid">
      ${dogs.map(({ dog, readiness, load }) => `
        <article class="${readiness.level}">
          <span>${dog.role}</span>
          <b>${dog.name}</b>
          <small>${readiness.title} - ${load.toFixed(1)} km / 7 j</small>
        </article>
      `).join("") || `<p class="empty-state">Ajoute des chiens pour obtenir le tableau sante.</p>`}
    </section>
  `;
}

function editRun(index) {
  const run = state.runs[index];
  if (!run) return;

  const newKm = prompt("Distance km", run.km);
  if (!newKm) return;

  const newType = prompt("Type de sortie", run.type) || run.type;
  run.km = Number(newKm);
  run.type = newType;
  saveState();
  render();
}

function deleteRun(index) {
  if (!state.runs[index] || !confirm("Supprimer cette activite ?")) return;
  state.runs.splice(index, 1);
  saveState();
  render();
}

let _runDetailMap = null;
let _runDetailIndex = null;

function openRunDetail(index) {
  const run = state.runs[index];
  if (!run) return;
  _runDetailIndex = index;

  // Stats
  document.getElementById("run-detail-type").textContent = run.type || "Sortie";
  document.getElementById("run-detail-date").textContent = formatDate(run.date);
  document.getElementById("rd-km").textContent = (run.km || 0).toFixed(2) + " km";
  document.getElementById("rd-speed").textContent = (run.speed || 0).toFixed(1) + " km/h";
  document.getElementById("rd-dogs").textContent = (run.team?.length || 0) + " chien(s)";

  // Durée estimée
  const durMin = run.km && run.speed > 0 ? Math.round(run.km / run.speed * 60) : 0;
  const h = Math.floor(durMin / 60), m = durMin % 60;
  document.getElementById("rd-duration").textContent = h > 0 ? `${h}h${String(m).padStart(2,"0")}` : `${m} min`;

  // Infos
  document.getElementById("rd-weather").textContent = run.weather || "—";
  document.getElementById("rd-energy").textContent = run.energy ? run.energy + " / 5" : "—";
  document.getElementById("rd-recovery").textContent = run.recovery || "—";
  document.getElementById("rd-notes").textContent = run.notes || "—";

  // Naviguer vers l'écran
  showScreen("run-detail");

  // Carte Leaflet
  setTimeout(() => {
    const mapEl = document.getElementById("run-detail-map");

    // Détruire la carte précédente
    if (_runDetailMap) { _runDetailMap.remove(); _runDetailMap = null; }

    const path = (run.path || [])
      .map(p => Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lon ?? p.lng])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

    // Centre par défaut si pas de tracé
    const center = path.length > 0
      ? [path.reduce((s,p)=>s+p[0],0)/path.length, path.reduce((s,p)=>s+p[1],0)/path.length]
      : [48.85, 2.35];

    _runDetailMap = L.map(mapEl, { zoomControl: true, attributionControl: false }).setView(center, 15);

    // Fond de carte OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(_runDetailMap);

    if (path.length > 1) {
      const polyline = L.polyline(path, { color: "#fc4c02", weight: 4, opacity: 0.9 }).addTo(_runDetailMap);
      _runDetailMap.fitBounds(polyline.getBounds(), { padding: [20, 20] });

      // Marqueur départ (vert)
      L.circleMarker(path[0], { radius: 8, fillColor: "#22c55e", color: "#fff", weight: 2, fillOpacity: 1 })
        .bindTooltip("Départ").addTo(_runDetailMap);
      // Marqueur arrivée (orange)
      L.circleMarker(path[path.length-1], { radius: 8, fillColor: "#fc4c02", color: "#fff", weight: 2, fillOpacity: 1 })
        .bindTooltip("Arrivée").addTo(_runDetailMap);
    }

    _runDetailMap.invalidateSize();
  }, 150);
}

// Boutons écran détail
document.getElementById("run-detail-back")?.addEventListener("click", () => navigateTo("record"));
document.getElementById("run-detail-delete")?.addEventListener("click", () => {
  if (_runDetailIndex === null) return;
  if (!confirm("Supprimer cette activité ?")) return;
  deleteRun(_runDetailIndex);
  showScreen("record");
});

function renderWeeklyChart() {
  const list = document.querySelector('[data-list="weeklyChart"]');
  if (!list) return;
  const weeks = getWeeklyTotals();
  const max = Math.max(1, ...weeks.map((week) => week.km));
  list.innerHTML = weeks.map((week) => `
    <article>
      <div class="bar" style="height:${Math.max(10, (week.km / max) * 120)}px"></div>
      <span>${week.label}</span>
      <b>${week.km.toFixed(0)}</b>
    </article>
  `).join("");
}

function renderDogLoads() {
  const list = document.querySelector('[data-list="dogLoads"]');
  if (!list) return;
  list.innerHTML = state.dogs.map((dog) => {
    const load = getDogRecentKm(dog.id);
    const level = load > 45 ? "high" : load < 10 ? "low" : "ok";
    return `
      <article class="load-row ${level}">
        <div>
          <b>${dog.name}</b>
          <span>${dog.role} - ${level === "high" ? "charge haute" : level === "low" ? "a remettre au travail" : "equilibre"}</span>
        </div>
        <strong>${load.toFixed(1)} km</strong>
      </article>
    `;
  }).join("");
}

function renderAlerts() {
  const list = document.querySelector('[data-list="alerts"]');
  if (!list) return;
  const alerts = buildAlerts();
  list.innerHTML = alerts.map((alert) => `
    <article class="alert-card ${alert.level}">
      <span>${alert.label}</span>
      <p>${alert.text}</p>
    </article>
  `).join("") || `<p class="empty-state">Aucune alerte. La charge semble bien repartie.</p>`;
}

// ── Conseils chiens sportifs — banque de 30 conseils ─────────────────────────
const ADVICE_BANK = [
  {
    label: "Échauffement",
    title: "5 minutes de trot avant l'effort",
    text: "Un échauffement progressif prépare les tendons, les muscles et le système cardio-vasculaire. Commence toujours par 3 à 5 minutes de trot léger avant d'augmenter l'allure. Les blessures tendineuses surviennent souvent sur des chiens partis trop vite à froid.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Récupération",
    title: "Le retour au calme est aussi important que l'effort",
    text: "Après une sortie intense, 5 à 10 minutes de marche permettent de relancer la circulation et d'évacuer l'acide lactique. Observer la respiration, la démarche et l'appétit dans les heures qui suivent donne de précieuses informations sur l'état du chien.",
    source: "IFSS Athlete Guidelines",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Hydratation",
    title: "Proposer souvent, ne pas attendre la soif",
    text: "Un chien sportif ne se rend pas compte de sa déshydratation. Propose de petites prises régulières avant, pendant et après l'effort. En hiver, l'eau doit rester liquide : un chien qui mange de la neige compense mais pas suffisamment.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Nutrition",
    title: "Graisses pour l'endurance, glucides pour le sprint",
    text: "Les chiens d'endurance (Iditarod, mid-distance) fonctionnent à 60–70 % sur les lipides. Les chiens de sprint utilisent davantage les glucides. En saison, augmente progressivement la ration de 10 à 30 % selon la charge d'entraînement.",
    source: "Purina / ISDVMA",
    url: "https://www.purina.com/articles/dog/health/nutrition/sled-dog-nutrition"
  },
  {
    label: "Coussinets",
    title: "Durcissement progressif avant la saison",
    text: "Les coussinets s'endurcissent avec une exposition graduelle à différentes surfaces. Commence sur herbe et terrain souple, puis introduis gravier et asphalte frais sur de courtes distances. Un coussinet dur résiste mieux à la neige abrasive et au bitume chaud.",
    source: "Cornell Canine Health",
    url: "https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center"
  },
  {
    label: "Chaleur",
    title: "Sortir tôt le matin, pas après 10h en été",
    text: "Les chiens évacuent la chaleur principalement par le halètement et les coussinets. Au-delà de 20°C avec humidité, les risques d'hyperthermie augmentent rapidement. Préfère l'aube ou le crépuscule, en forêt ou sur herbe, avec eau disponible.",
    source: "Cornell / Red Cross",
    url: "https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/summer-heat-safety-tips-dogs"
  },
  {
    label: "Coup de chaleur",
    title: "Signaux d'alerte à ne jamais ignorer",
    text: "Halètement excessif, bave épaisse, faiblesse, confusion, vomissements ou effondrement = urgence. Refroidis progressivement avec de l'eau fraîche (pas de glace), arrose cou, aines et pattes, puis vétérinaire immédiatement.",
    source: "American Red Cross",
    url: "https://www.redcross.org/take-a-class/resources/learn-pet-first-aid/dog/heat-stroke"
  },
  {
    label: "Froid",
    title: "Hypothermie : à surveiller après l'effort",
    text: "Un chien mouillé qui s'arrête perd sa chaleur rapidement. Sèche les chiens après la sortie, évite les longues pauses par temps froid et humide. Les chiens à poil court ou peu entraînés sont plus vulnérables que les nordiques.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Pattes",
    title: "Glace entre les doigts : source de boiteries",
    text: "En conditions neige/gel, des boules de glace peuvent se former entre les doigts et créer une douleur aiguë. Vérifie et décoince-les régulièrement pendant la sortie. La cire de protection pour pattes réduit ce risque et protège aussi la neige abrasive.",
    source: "Canicross UK",
    url: "https://canicrossuk.com/blog/f/when-canicrossing-in-hotter-weather"
  },
  {
    label: "Tendinites",
    title: "La surcharge arrive souvent au retour de vacances",
    text: "Après une pause de 2 semaines ou plus, les chiens perdent leur condition physique plus vite que les humains. Ne reprends pas à la même intensité qu'avant la coupure. Une reprise progressive sur 2 à 3 semaines évite 80 % des blessures tendineuses.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Sommeil",
    title: "16 à 18h de sommeil par jour pour un chien sportif",
    text: "Le chien sportif a besoin de plus de repos que le chien sédentaire. La réparation musculaire et la consolidation des apprentissages se font principalement pendant le sommeil. Un chien qui dort bien récupère bien.",
    source: "VetCompass / RVC",
    url: "https://www.rvc.ac.uk/vetcompass"
  },
  {
    label: "Progressivité",
    title: "La règle des 10 % par semaine",
    text: "N'augmente jamais le volume hebdomadaire de plus de 10 % par rapport à la semaine précédente. Les tendons et cartilages mettent plus de temps à s'adapter que les muscles. C'est cette différence qui provoque les blessures de surcharge.",
    source: "Journal of Veterinary Sports Medicine",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Alimentation",
    title: "Ne pas nourrir juste avant l'effort",
    text: "Un repas important dans les 2 heures précédant l'effort peut provoquer une dilatation gastrique, surtout chez les grandes races. En pratique : repas léger ou rien 2h avant la sortie, et repas principal après le retour au calme complet.",
    source: "Purina / ISDVMA",
    url: "https://www.purina.com/articles/dog/health/nutrition/sled-dog-nutrition"
  },
  {
    label: "Muscles",
    title: "Masse musculaire visible = chien bien préparé",
    text: "Un chien sportif bien conditionné a une musculature dorsale, lombaire et des cuisses développée. Observe régulièrement la silhouette : perte de masse sur le dos ou les cuisses = signal de surcharge ou d'alimentation insuffisante.",
    source: "AKC Canine Health Foundation",
    url: "https://www.akcchf.org/"
  },
  {
    label: "Harnais",
    title: "Un harnais mal ajusté = frottements et blocages",
    text: "Un harnais trop large frotte les aisselles et peut créer des plaies. Trop serré, il limite la foulée. L'idéal : 2 doigts entre le harnais et le corps sur toute la surface. Vérifie l'ajustement à chaque sortie car le poids du chien fluctue.",
    source: "ESDRA / FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Comportement",
    title: "Un chien qui tire moins = signe à surveiller",
    text: "Un chien qui tire nettement moins qu'à son habitude peut exprimer une douleur, une fatigue excessive ou un problème de santé débutant. Ce signal précède souvent la boiterie de plusieurs jours. Note-le dans MushTrack et observe les jours suivants.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Vétérinaire",
    title: "Bilan sportif annuel : un investissement",
    text: "Un bilan vétérinaire sportif avant la saison (auscultation cardiaque, palpation des tendons, poids, dentition) permet de détecter des problèmes avant qu'ils deviennent graves. Certains vétérinaires proposent aussi un ECG pour les chiens d'endurance.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Équipe",
    title: "Chaque chien a sa place dans l'attelage",
    text: "En attelage, les chiens de tête (leaders) ont besoin de bonnes capacités de concentration et d'obéissance. Les roues (proches du sled) sont généralement les plus puissants. Observer les affinités entre chiens aide à former des paires qui tirent mieux ensemble.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Parasites",
    title: "Tiques et filariose : protection avant la saison",
    text: "Les chiens sportifs évoluent souvent en milieu boisé ou humide où les tiques sont nombreuses. Vérifie chaque chien après la sortie, en particulier oreilles, aines, cou et entre les doigts. Maintiens à jour la protection antiparasitaire toute l'année.",
    source: "ESCCAP Guidelines",
    url: "https://www.esccap.org/"
  },
  {
    label: "Récupération active",
    title: "La nage : meilleure rééducation musculaire",
    text: "La nage en eau fraîche combine refroidissement, stimulation musculaire et décharge articulaire. Pour un chien qui récupère d'une blessure légère ou d'une grosse semaine de travail, une courte séance de nage peut remplacer une sortie de récupération.",
    source: "AKC Canine Health Foundation",
    url: "https://www.akcchf.org/"
  },
  {
    label: "Psychologie",
    title: "Un chien motivé progresse plus vite",
    text: "La motivation est un carburant au même titre que la nutrition. Varie les parcours, alterne efforts et séances de jeu, termine toujours sur une note positive. Un chien qui s'ennuie ou subit l'entraînement développe des comportements d'évitement et régresse.",
    source: "Canicross UK",
    url: "https://canicrossuk.com/"
  },
  {
    label: "Électrolytes",
    title: "En compétition, prévoir des électrolytes",
    text: "Lors d'efforts longs (plus de 60 à 90 minutes) ou par grande chaleur, les chiens perdent des sels minéraux par transpiration et halètement. Des compléments électrolytiques spécifiques pour chiens sportifs permettent une meilleure récupération.",
    source: "Purina Pro Plan Veterinary",
    url: "https://www.purina.com/articles/dog/health/nutrition/sled-dog-nutrition"
  },
  {
    label: "Truffe",
    title: "Soleil fort : protéger les truffe roses",
    text: "Les chiens à truffe rose ou dépigmentée peuvent souffrir de coups de soleil sur le museau, surtout lors de sorties longues en altitude ou en neige réfléchissante. Applique un écran solaire adapté aux chiens (non toxique si léché) avant les longues sorties.",
    source: "VCA Animal Hospitals",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Cardio",
    title: "Le cœur s'adapte à l'entraînement",
    text: "Chez les chiens d'endurance bien entraînés, la fréquence cardiaque au repos peut descendre en dessous de 50 bpm (contre 60–100 chez un sédentaire). Une bonne condition cardio se construit sur 3 à 6 mois d'entraînement progressif.",
    source: "ISDVMA / Veterinary Cardiology",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Blessure",
    title: "Boiterie légère = repos 3 jours minimum",
    text: "Une boiterie légère après l'effort qui disparaît le lendemain matin est le premier signe d'une tendinite débutante. 3 jours de repos complet suffisent souvent. Ignorer ce signe et continuer l'entraînement peut transformer une micro-lésion en blessure grave.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Poids",
    title: "Peser son chien chaque mois",
    text: "Un chien sportif bien nourri et bien entraîné maintient un poids stable avec une légère variation selon l'intensité de la saison. Une perte de poids sans changement de ration mérite une consultation vétérinaire. On doit sentir les côtes sans les voir.",
    source: "Cornell Canine Health",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Dents",
    title: "Santé dentaire et performance",
    text: "Des dents douloureuses ou infectées réduisent l'appétit et donc les performances. Un détartrage annuel et un brossage hebdomadaire maintiennent une bonne hygiène buccale. L'haleine d'un chien sportif sain ne devrait pas être forte.",
    source: "AVMA Dental Guidelines",
    url: "https://www.avma.org/"
  },
  {
    label: "Altitude",
    title: "En montagne, acclimatation nécessaire",
    text: "Au-dessus de 2000 m, les chiens comme les humains ont besoin de 2 à 3 jours pour s'acclimater avant de pouvoir fournir un effort maximal. Réduis le volume et l'intensité lors des premiers jours en altitude, observe la récupération et hydrate davantage.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Communication",
    title: "Apprendre à lire le langage corporel",
    text: "Un chien qui baisse les oreilles, tourne la tête, se lèche les babines ou bâille en plein effort envoie des signaux de stress ou d'inconfort. Ces micro-signaux, visibles en s'observant et en filmant les sorties, permettent d'anticiper la fatigue ou la douleur.",
    source: "Turid Rugaas / Canicross",
    url: "https://canicrossuk.com/"
  },
  {
    label: "Semaine de récup",
    title: "Une semaine légère toutes les 3 à 4 semaines",
    text: "Intégrer une semaine de récupération (volume réduit de 40 à 50 %, intensité légère) permet aux tendons, cartilages et au système nerveux de récupérer. Les chiens qui ont des semaines de récup dans leur plan progressent plus vite et se blessent moins.",
    source: "IFSS Athlete Guidelines",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Neige vs Trail",
    title: "Le passage neige → terrain dur demande une adaptation",
    text: "Les chiens habitués à courir sur neige souple ont des coussinets plus sensibles aux terrains durs. En début de saison dryland ou lors du passage hiver → printemps, réduis les distances sur asphalte et observe les coussinets quotidiennement pendant 2 semaines.",
    source: "FFSLC / Canicross France",
    url: "https://ffslc.fr/"
  },

  // ── Conseils 31–100 ──────────────────────────────────────────────

  {
    label: "Cire coussinets",
    title: "La cire protège, elle ne remplace pas l'endurance",
    text: "La cire pour coussinets (Musher's Secret, Pawz, etc.) protège contre la neige collante, le sel de déneigement et les terrains abrasifs. Elle ne remplace pas un durcissement progressif. Applique avant la sortie sur des coussinets propres et secs. Idéal aussi après la sortie pour hydrater.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Alimentation hiver",
    title: "En grand froid, doubler la ration peut être nécessaire",
    text: "Par températures très négatives (en dessous de -20°C), un chien de traîneau peut brûler 2 à 3 fois plus de calories que d'habitude pour maintenir sa température. Les mushers de longue distance augmentent la ration de graisse (suif, huile de saumon) plutôt que de glucides.",
    source: "Iditarod Vet Guidelines",
    url: "https://iditarod.com/race/veterinary/"
  },
  {
    label: "Bottes chien",
    title: "Les bottes : à utiliser avec précaution",
    text: "Les bottes protègent les coussinets lors de sorties sur neige croûtée, glace ou sel. Mais elles modifient la proprioception du chien et peuvent créer des irritations si mal ajustées. Habitue le chien progressivement, commence par 2 pattes, et vérifie après chaque sortie.",
    source: "Canicross UK",
    url: "https://canicrossuk.com/"
  },
  {
    label: "Foulée",
    title: "Observer la foulée permet de détecter une douleur précoce",
    text: "Filme tes chiens de profil et de derrière pendant l'effort. Une légère asymétrie de foulée, un manque d'amplitude ou une tête qui monte à chaque appui sont souvent visibles sur vidéo avant d'être perceptibles à l'œil en courant avec eux.",
    source: "ISDVMA / Physio canine",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Chien vieillissant",
    title: "À partir de 7 ans, adapter la charge progressivement",
    text: "Les chiens nordiques restent performants jusqu'à 10-12 ans, mais leur récupération ralentit à partir de 7-8 ans. Réduis les intensités élevées, augmente les jours de récupération et sois plus attentif aux signes de raideur matinale. La qualité prime sur la quantité.",
    source: "VCA Animal Hospitals",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Jeune chien",
    title: "Avant 18 mois : pas de course à impact répété",
    text: "Les plaques de croissance des chiens ne sont pas fermées avant 12 à 18 mois selon la race. Les efforts répétés à haute intensité avant cet âge peuvent créer des lésions définitives. Favorise le jeu, la marche, la natation et le travail léger jusqu'à la maturité osseuse.",
    source: "Cornell Canine Health",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Vaccination",
    title: "Vaccins à jour avant les regroupements de chiens",
    text: "En compétition ou stage, tes chiens côtoient des dizaines d'autres chiens. Leptospirose, toux du chenil, parvovirose, rage (si international) : vérifie que les rappels sont à jour 3 semaines avant tout événement pour que l'immunité soit maximale.",
    source: "ESCCAP Guidelines",
    url: "https://www.esccap.org/"
  },
  {
    label: "Vermifuge",
    title: "Vermifuger tous les 3 mois chez le chien sportif",
    text: "Les chiens actifs en milieu naturel sont plus exposés aux parasites internes. Un vermifuge large spectre tous les 3 mois est recommandé. Certains parasites (ténia, giardia) peuvent affecter l'absorption des nutriments et donc les performances.",
    source: "ESCCAP Guidelines",
    url: "https://www.esccap.org/"
  },
  {
    label: "Musculature dorsale",
    title: "Renforcer le dos pour prévenir les blessures de traction",
    text: "Les chiens qui tirent (traîneau, bikejoring, canicross) sollicitent fortement les muscles du dos et des épaules. Des exercices de proprioception (marcher sur surfaces instables, cavalettis, natation) renforcent ces muscles et réduisent le risque de hernies discales.",
    source: "Physiothérapie vétérinaire / CCRP",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Lombes",
    title: "Surveiller la sensibilité lombaire après effort intense",
    text: "Après une grosse semaine, passe tes mains le long de la colonne vertébrale du chien. Un tressautement des muscles ou une raideur à la palpation lombaire peut indiquer un début de tension musculaire. 2 jours de repos et massage doux suffisent souvent.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Nettoyage oreilles",
    title: "Les chiens actifs en forêt accumulent plus de débris",
    text: "Après chaque sortie en terrain boisé ou humide, vérifie les oreilles. Les chiens aux oreilles tombantes sont plus sujets aux otites. Un coton légèrement imbibé de lotion auriculaire et un contrôle visuel hebdomadaire suffisent à prévenir la plupart des problèmes.",
    source: "VCA Animal Hospitals",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Griffes",
    title: "Des griffes trop longues modifient l'appui et fatiguent les tendons",
    text: "Des griffes qui touchent le sol en position debout forcent les doigts en hyperextension, créant une tension sur les tendons fléchisseurs. Coupe-les toutes les 3 à 4 semaines ou après chaque longue course sur terrain dur qui les lime naturellement.",
    source: "Cornell Canine Health",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Eau froide",
    title: "Laisser boire de l'eau froide n'est pas dangereux",
    text: "Contrairement à une idée reçue, l'eau froide après l'effort ne provoque pas de crampes chez le chien. Ce qui compte c'est la quantité : laisser boire par petites prises pour ne pas provoquer de dilatation gastrique, surtout chez les grandes races.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Alimentation post-effort",
    title: "La fenêtre métabolique : 30 à 90 minutes après l'effort",
    text: "Les muscles sont particulièrement réceptifs aux nutriments dans l'heure qui suit l'effort. Un repas riche en protéines et graisses dans cette fenêtre accélère la récupération musculaire. Pour les courses longues, une collation de récupération (viande, fromage) avant le repas principal est utile.",
    source: "Purina Pro Plan Veterinary",
    url: "https://www.purina.com/"
  },
  {
    label: "Canicross débutant",
    title: "Débuter par la marche active, pas la course",
    text: "Pour un chien débutant en canicross, commence par des marches énergiques en laisse classique avant d'introduire la ligne élastique. Il doit d'abord comprendre le concept de tirer vers l'avant sans distraction. La course vient après la confiance.",
    source: "FFSLC / Canicross France",
    url: "https://ffslc.fr/"
  },
  {
    label: "Ligne de trait",
    title: "Vérifier régulièrement l'état du matériel de traction",
    text: "Les lignes de trait, traits d'attelage et connecteurs en caoutchouc se fragilisent avec le temps et le froid. Une ligne qui lâche en pleine descente peut provoquer une chute grave. Inspecte coutures, mousquetons et élastiques avant chaque sortie sérieuse.",
    source: "ESDRA",
    url: "https://ffslc.fr/"
  },
  {
    label: "Forge mentale",
    title: "Habituer le chien aux imprévus de course",
    text: "En compétition, les chiens sont confrontés à d'autres chiens, foules, véhicules, bruits inhabituels. Intègre ces expositions progressivement à l'entraînement : cours dans des environnements variés, habitue ton chien à croiser d'autres équipes au départ.",
    source: "Comportement canin / FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Gestion de meute",
    title: "La hiérarchie sociale influence les performances",
    text: "Des tensions entre chiens de l'attelage réduisent les performances et augmentent le stress de tous. Identifie les affinités et les incompatibilités. Les paires qui s'entendent bien tirent mieux ensemble. Évite de forcer des chiens incompatibles en tandem.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Bivouac",
    title: "En longue distance : l'arrêt est une partie de la course",
    text: "Pour les mid-distance et longues distances, les pauses obligatoires sont une opportunité de récupération. Maîtriser l'art du bivouac (alimentation rapide, massage des chiens, remplacement des bottes) peut faire gagner autant de temps qu'une belle allure.",
    source: "Iditarod Vet Guidelines",
    url: "https://iditarod.com/race/veterinary/"
  },
  {
    label: "Massage sportif",
    title: "5 minutes de massage après l'effort = moins de courbatures",
    text: "Un effleurage léger des masses musculaires principales (épaules, cuisses, dos) après la sortie améliore la circulation et accélère l'élimination des déchets métaboliques. Commence toujours par des mouvements doux dans le sens du poil, en observant les réactions du chien.",
    source: "Physiothérapie vétérinaire / CCRP",
    url: "https://www.akcchf.org/"
  },
  {
    label: "Crochets d'attelage",
    title: "Apprendre les commandes de base avant l'attelage",
    text: "Avant de harnacher un chien pour la première fois, il doit répondre à : son nom, arrêt, allons-y (ou hike), et gauche/droite pour les leaders. Ces bases facilitent la sécurité et la communication pendant la sortie, surtout sur des carrefours.",
    source: "FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Surentraînement",
    title: "Le surentraînement se détecte sur le comportement, pas seulement la performance",
    text: "Un chien surentraîné ne montre pas toujours de baisse de performance immédiate. Les premiers signes sont comportementaux : moins d'enthousiasme au départ, irritabilité, mauvais appétit, sommeil agité. Prends ces signaux au sérieux avant qu'une blessure ne s'installe.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Fréquence cardiaque",
    title: "Apprendre à prendre le pouls de son chien",
    text: "Le pouls se prend à l'intérieur de la cuisse (artère fémorale) ou sur le thorax derrière le coude gauche. Au repos : 60–100 bpm. Après effort intense : jusqu'à 200–220 bpm. Il doit revenir sous 100 bpm dans les 5 minutes suivant l'arrêt de l'effort.",
    source: "Cornell Canine Health",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Respiration",
    title: "Le halètement anormal : 3 critères à surveiller",
    text: "Un halètement est préoccupant s'il est : 1) disproportionné à l'effort fourni, 2) accompagné de bruits inhabituels (sifflement, ronflement), 3) toujours présent 10 minutes après l'arrêt. Ces signes peuvent indiquer une hyperthermie, une douleur ou un problème respiratoire.",
    source: "American Red Cross / VCA",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Gencives",
    title: "La couleur des gencives est un indicateur vital",
    text: "Des gencives roses et humides = chien bien hydraté et oxygéné. Des gencives pâles (anémie possible), blanches (choc), bleues (manque d'oxygène) ou brun-gris (intoxication) sont des urgences vétérinaires. Test de remplissage capillaire : appuie 2 secondes, les gencives doivent redevenir roses en moins de 2 secondes.",
    source: "American Red Cross",
    url: "https://www.redcross.org/"
  },
  {
    label: "Course de nuit",
    title: "Préparer les chiens aux sorties nocturnes",
    text: "En compétition hivernale, une partie du parcours se fait souvent de nuit. Habilitue tes chiens aux sorties avec frontale pendant l'entraînement. Les lumières des véhicules ou les ombres peuvent perturber certains chiens. La familiarisation progressive évite les blocages en course.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Chaleur et races",
    title: "Certaines races supportent mieux la chaleur que d'autres",
    text: "Les races brachycéphales (Boxer, Bouledogue) et les nordiques à double manteau (Husky, Malamute) surchauffent plus vite. Les races à pelage court et fin ou d'origine méditerranéenne (Greyhound, Vizsla, Braque) tolèrent mieux la chaleur mais sont moins isolées en hiver.",
    source: "Cornell Canine Health",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Poids de course",
    title: "En compétition, un chien légèrement plus sec court mieux",
    text: "Un excès de poids de 5 à 10 % au-dessus du poids de course idéal augmente significativement la dépense énergétique. À l'inverse, un chien trop maigre manque de réserves. L'objectif est de sentir les côtes facilement sans les voir, avec une légère silhouette athlétique.",
    source: "Purina / ISDVMA",
    url: "https://www.purina.com/"
  },
  {
    label: "Dryland",
    title: "L'entraînement dryland doit précéder la saison neige",
    text: "4 à 8 semaines de dryland (vélo, trottinette, quad) avant la neige permet de bâtir une base cardio-vasculaire et musculaire. Les chiens arrivent plus en forme et récupèrent mieux lors des premières sorties sur neige, souvent intenses à cause de leur enthousiasme.",
    source: "ESDRA / FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Boue et pistes détrempées",
    title: "Le terrain glissant fatigue 3 fois plus vite",
    text: "Sur terrain boueux ou glissant, les chiens dépensent beaucoup plus d'énergie musculaire pour maintenir leur équilibre. Réduis le volume de 30 à 40 % par rapport à une piste normale. Les coussinets s'abîment aussi plus vite sur terrain abrasif mouillé.",
    source: "Canicross UK",
    url: "https://canicrossuk.com/"
  },
  {
    label: "Gestion de l'eau",
    title: "Toujours prévoir plus d'eau qu'on ne pense nécessaire",
    text: "En sortie longue, prévoir au minimum 500 ml par chien par heure en conditions tempérées, et le double par chaleur. En hiver, l'eau doit être tiède pour encourager la consommation : les chiens boivent moins volontiers l'eau froide ou glacée.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Alimentation race longue",
    title: "En longue distance, alimenter pendant l'effort",
    text: "Pour les courses de plus de 4 heures (ou 6h de trajet pour les traîneaux), des collations pendant les pauses (viande, fromage, flocons d'avoine gras) maintiennent la glycémie et retardent la fatigue. La capacité à manger pendant l'effort s'entraîne aussi.",
    source: "Iditarod Vet Guidelines",
    url: "https://iditarod.com/race/veterinary/"
  },
  {
    label: "Santé des os",
    title: "Calcium et phosphore : l'équilibre compte plus que la quantité",
    text: "Un déséquilibre Ca/P dans la ration peut causer des problèmes osseux et articulaires à long terme. Les croquettes premium maintiennent cet équilibre. Si tu donnes de la viande fraîche, ajoute des os à mâcher (riches en calcium) ou un complément minéral adapté.",
    source: "AVMA Nutritional Guidelines",
    url: "https://www.avma.org/"
  },
  {
    label: "Oméga-3",
    title: "L'huile de saumon : un complément simple et efficace",
    text: "Les oméga-3 (EPA et DHA) réduisent l'inflammation, améliorent la récupération musculaire et la qualité du pelage. 1 à 2 cuillères à café d'huile de saumon par jour pour un chien de 25 kg est une dose courante. Stocke-la au frais et jette-la si elle sent le rance.",
    source: "Purina Pro Plan Veterinary",
    url: "https://www.purina.com/"
  },
  {
    label: "Chaleur du sol",
    title: "Test de la paume : 5 secondes sur le sol = coussinets",
    text: "Pose ta paume sur l'asphalte 5 secondes. Si tu ne peux pas tenir, tes chiens non plus. En été, même à 20°C ambiants, l'asphalte peut dépasser 50°C. Privilégie les zones ombragées, l'herbe ou les pistes forestières pour protéger les coussinets.",
    source: "Cornell / Canicross UK",
    url: "https://canicrossuk.com/"
  },
  {
    label: "Compétition : acclimatation",
    title: "Arriver tôt pour laisser les chiens se familiariser",
    text: "Les chiens stressés par l'environnement de course (odeurs, bruits, autres chiens) dépensent de l'énergie avant même le départ. Arriver la veille ou plusieurs heures avant, laisser les chiens explorer en laisse calme et maintenir leur routine alimentaire habituelle.",
    source: "FFSLC / ESDRA",
    url: "https://ffslc.fr/"
  },
  {
    label: "Transport",
    title: "Un trajet de plusieurs heures compte dans la récupération",
    text: "Un long trajet en voiture avant une course stresse les chiens et réduit leur récupération. Prévois des arrêts toutes les 2h pour qu'ils bougent, urinent et boivent. En caisse, la ventilation est cruciale. Un chien qui arrive stressé et déshydraté court moins bien.",
    source: "FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Hygiène post-course",
    title: "Nettoyer les pattes après chaque sortie hivernale",
    text: "Le sel de déneigement est agressif pour les coussinets et peut provoquer des brûlures chimiques si non rincé. Après chaque sortie en zone traitée, trempe les pattes dans de l'eau tiède propre et sèche-les. Applique de la cire après séchage complet.",
    source: "VCA Animal Hospitals",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Chien de tête",
    title: "Un bon leader se forme en plusieurs saisons",
    text: "Le chien de tête (lead dog) doit répondre aux commandes directionnelles (gee/haw ou droite/gauche), maintenir l'allure et gérer le stress de la tête de meute. Ce rôle s'apprend progressivement : commence à 2 en tête avec un chien expérimenté comme mentor.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Déshydratation légère",
    title: "Test de la peau pour détecter une déshydratation",
    text: "Pince doucement la peau du cou ou entre les épaules et relâche. Elle doit revenir à sa position en moins d'une seconde. Un retour plus lent indique une déshydratation légère à modérée. Dans ce cas, offre de l'eau immédiatement et surveille dans les heures suivantes.",
    source: "American Red Cross / VCA",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Raideur matinale",
    title: "La raideur au réveil dure combien de temps ?",
    text: "Une légère raideur après une grosse sortie qui disparaît en moins de 10 minutes après le lever est normale. Si elle persiste plus de 15 minutes, si elle empire ou si elle revient chaque matin, c'est un signal que la charge est trop élevée ou qu'une blessure s'installe.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Nutrition croquettes",
    title: "Lire l'étiquette : la protéine animale doit être en premier",
    text: "Sur une étiquette de croquettes, les ingrédients sont listés par ordre de poids. Pour un chien sportif, la viande ou le poisson (poulet, bœuf, saumon) doit être le premier ingrédient. Les croquettes 'all-life-stages' à haute teneur en protéines (30%+) conviennent bien aux chiens actifs.",
    source: "Purina / AVMA",
    url: "https://www.purina.com/"
  },
  {
    label: "Antidouleur naturel",
    title: "Le curcuma : intérêt et limites pour le chien sportif",
    text: "Le curcuma a des propriétés anti-inflammatoires documentées. Certains mushers l'utilisent en complément (pâte d'or : curcuma + huile de coco + poivre noir). Les effets sont modérés et non immédiats. Il ne remplace pas les anti-inflammatoires vétérinaires lors d'une vraie blessure.",
    source: "AKC Canine Health Foundation",
    url: "https://www.akcchf.org/"
  },
  {
    label: "Acide lactique",
    title: "Les chiens éliminent l'acide lactique plus vite que les humains",
    text: "Contrairement aux humains, les chiens nordiques entraînés oxydent très efficacement l'acide lactique. Leur principal facteur limitant en endurance n'est pas l'acide lactique mais la déplétion des réserves glycogéniques et la déshydratation. C'est pourquoi nutrition et hydratation sont primordiales.",
    source: "ISDVMA / Exercise Physiology",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Laisse élastique",
    title: "Régler correctement l'amortisseur de canicross",
    text: "La longueur idéale de la ligne de canicross est de 1,5 à 2 mètres (plus l'amortisseur). L'amortisseur doit avoir une extension de 30 à 40 % de sa longueur au repos. Trop court : coups brusques sur les hanches. Trop long : le chien part dans les jambes. Teste à allure stable.",
    source: "FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Bilan sanguin",
    title: "Un bilan annuel révèle ce que l'œil ne voit pas",
    text: "Un bilan sanguin annuel (NFS, biochimie, thyroïde) chez un chien sportif permet de détecter une anémie, une insuffisance rénale débutante ou une hypothyroïdie qui peut expliquer une baisse de performance. Le coût est faible par rapport à une saison perdue.",
    source: "ISDVMA / Cornell",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Photosensibilité",
    title: "Les chiens à robe claire sont sensibles aux UV en neige",
    text: "La réflexion des UV sur la neige peut provoquer des coups de soleil sur la truffe, les oreilles et les zones peu poilues des chiens à robe claire. En haute montagne ou en longue sortie par beau temps hivernal, un écran solaire spécial chien (sans zinc) peut être appliqué.",
    source: "VCA / Cornell",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Repos actif",
    title: "Les jours de repos n'ont pas à être passifs",
    text: "Un jour de repos actif (marche de 20 minutes, natation douce, jeu libre dans un espace clôturé) vaut mieux qu'une journée totalement sédentaire. Le mouvement léger maintient la circulation, réduit les raideurs et garde le chien mentalement stimulé.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Entraînement par temps chaud",
    title: "Réduire l'allure de 20 % dès 18°C",
    text: "À partir de 18°C, réduis l'allure de 20 % et la distance de 30 %. À partir de 22°C, envisage de reporter la sortie à tôt le matin ou annuler. Ces seuils sont abaissés pour les races nordiques et les chiens à double manteau.",
    source: "FFSLC / Canicross UK",
    url: "https://canicrossuk.com/"
  },
  {
    label: "Sécurité attelage",
    title: "Toujours sécuriser le sled/vélo avant de harnacher",
    text: "Un traîneau ou vélo non fixé peut partir seul dès que les premiers chiens sont harnachés. Accroche toujours le frein, le snow hook ou enchaîne le vélo avant de toucher au premier harnais. Un accident à ce moment peut blesser des chiens ou d'autres personnes.",
    source: "ESDRA",
    url: "https://ffslc.fr/"
  },
  {
    label: "Ski-joering",
    title: "La ligne de ski-joering doit avoir un amortisseur obligatoire",
    text: "En ski-joering, une traction brutale sans amortisseur peut provoquer des chutes dangereuses. La ligne doit comporter un ou deux amortisseurs élastiques et avoir une longueur d'au moins 2,5 mètres entre le harnais et la ceinture. Assure-toi que le chien connaît la commande stop avant de commencer.",
    source: "ESDRA / FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Bikejoring",
    title: "Apprendre la commande 'On by' avant tout",
    text: "En bikejoring, la commande 'On by' (continuer sans s'intéresser à une distraction) est cruciale pour la sécurité. Un chien qui part sur le côté en pleine descente peut faire tomber le cycliste. Travaille cette commande à pied avant de l'utiliser en vélo.",
    source: "FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Chien Husky",
    title: "Le Husky sibérien : faible drive alimentaire, fort drive de mouvement",
    text: "Contrairement à d'autres races, le Husky s'entraîne principalement pour le plaisir de courir, pas pour la nourriture. Son alimentation doit être calculée avec précision car il mange souvent moins qu'on ne l'attend. En revanche, il exprime clairement sa motivation à l'effort par son comportement.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Sécurité route",
    title: "En canicross, rester visible sur route",
    text: "Si ton parcours croise des routes, équipe-toi de vêtements réfléchissants et ton chien d'un harnais ou collier avec bande réfléchissante. Le soir ou par mauvaise visibilité, ajoute une lumière clignotante sur le harnais. Un chien sombre est invisible pour un conducteur.",
    source: "Canicross UK",
    url: "https://canicrossuk.com/"
  },
  {
    label: "Hernie discale",
    title: "La prévention passe par le renforcement musculaire",
    text: "Les hernies discales sont plus fréquentes chez les chiens de grande taille soumis à des efforts répétés. Le renforcement des muscles du tronc (core) par des exercices de proprioception et natation protège la colonne. Évite aussi les sauts répétés à la descente de véhicule pour les grandes races.",
    source: "Physiothérapie vétérinaire / CCRP",
    url: "https://www.akcchf.org/"
  },
  {
    label: "Gestion de la douleur",
    title: "Les chiens masquent la douleur : chercher les signes indirects",
    text: "Un chien en douleur ne gémit pas toujours. Les signes indirects : réticence à se lever le matin, changement de comportement social, appétit diminué, griffes d'un seul côté plus usées (appui déporté), position de repos inhabituelle. Filme ton chien qui se lève pour détecter une asymétrie.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Contrôle vétérinaire en course",
    title: "Les checks vétérinaires en compétition sont des opportunités",
    text: "Dans les courses IFSS et longues distances, des vétérinaires officiels examinent les chiens aux checkpoints. Prépare tes chiens à être manipulés par des inconnus : toucher les pattes, les gencives, les muscles. Un chien qui refuse l'examen peut être retiré de la course.",
    source: "IFSS Vet Guidelines",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Plaisir avant performance",
    title: "Un chien qui adore ce qu'il fait s'entraîne mieux",
    text: "La motivation intrinsèque du chien est le meilleur prédicteur de performance à long terme. Si ton chien montre régulièrement de l'enthousiasme au départ (hurle, saute, tire) c'est bon signe. Si ce drive diminue sans raison physique apparente, examine les conditions d'entraînement et le stress global.",
    source: "Comportement canin / Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Fourrure",
    title: "Ne pas tondre un chien nordique en été",
    text: "Tondre un chien à double manteau (Husky, Malamute, Samoyède) ne le rafraîchit pas, au contraire. Le sous-poil joue un rôle isolant dans les deux sens (froid et chaud). Une coupe courte peut perturber sa repousse pour des mois et augmenter le risque de coup de soleil.",
    source: "Cornell Canine Health",
    url: "https://www.vet.cornell.edu/"
  },
  {
    label: "Brossage",
    title: "Le brossage régulier améliore la thermorégulation",
    text: "Un pelage non brossé et emmêlé réduit la ventilation de la peau et peut provoquer des irritations et une surchauffe. En période de mue (printemps et automne), brosse quotidiennement. Un chien bien brossé régule mieux sa température pendant l'effort.",
    source: "VCA Animal Hospitals",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Nourriture humide",
    title: "La pâtée contribue à l'hydratation en hiver",
    text: "En hiver, les chiens boivent naturellement moins. Ajouter de la pâtée ou de la viande cuite à leur ration augmente leur apport en eau de 70 à 80 %. C'est une stratégie simple et efficace pour maintenir une bonne hydratation en saison froide, surtout lors de longues sorties.",
    source: "Mush with P.R.I.D.E.",
    url: "https://vdsv.de/documents/2021/11/mush-with-pride-guidelines.pdf"
  },
  {
    label: "Génétique",
    title: "La sélection sur les performances : une responsabilité",
    text: "Les mushers de haut niveau qui font reproduire leurs chiens sélectionnent sur la santé, le tempérament, la conformation et la performance. Reproduire uniquement sur les performances athlétiques sans tenir compte de la santé articulaire et cardiaque peut propager des problèmes génétiques.",
    source: "AKC Canine Health Foundation",
    url: "https://www.akcchf.org/"
  },
  {
    label: "Premiers secours",
    title: "Avoir une trousse de premiers secours canine sur soi",
    text: "En course ou entraînement éloigné, une trousse de base peut sauver la situation : bandages, bandes cohésives, désinfectant, ciseaux, cire coussinets, couverture de survie, anti-douleur prescrit par ton vétérinaire. Un cours de premiers secours canins (Croix-Rouge) est un investissement précieux.",
    source: "American Red Cross",
    url: "https://www.redcross.org/"
  },
  {
    label: "Mue",
    title: "La mue coïncide souvent avec une baisse de forme",
    text: "Pendant la grande mue de printemps, certains chiens montrent une légère baisse d'énergie et d'appétit. C'est normal : le corps mobilise des ressources pour le renouvellement du pelage. Augmente légèrement les protéines et réduisez l'intensité pendant 2 à 3 semaines.",
    source: "VCA / Cornell",
    url: "https://vcahospitals.com/"
  },
  {
    label: "Microbiote intestinal",
    title: "L'intestin du chien sportif mérite attention",
    text: "L'effort intense peut temporairement perturber le microbiote intestinal, causant des diarrhées de stress post-compétition. Des probiotiques spécifiques pour chiens (Lactobacillus, Bifidobacterium) peuvent aider à stabiliser le microbiote en période intense. Commence 2 semaines avant une course importante.",
    source: "Purina Pro Plan Veterinary",
    url: "https://www.purina.com/"
  },
  {
    label: "Ceinture canicross",
    title: "Une ceinture bien ajustée protège le dos du coureur",
    text: "La ceinture de canicross doit se positionner sur les hanches (os iliaques), pas sur les lombaires. Trop haute, elle peut créer des douleurs lombaires au fil des sorties. Un modèle avec rembourrage latéral et attache centrale est plus stable qu'une simple ceinture de trail.",
    source: "FFSLC",
    url: "https://ffslc.fr/"
  },
  {
    label: "Objectif réaliste",
    title: "Calculer son délai de préparation pour une longue distance",
    text: "Un chien non entraîné a besoin de 12 à 18 mois de préparation progressive pour courir une mid-distance (80-200 km) dans de bonnes conditions. Pour une longue distance (300 km+), comptez 2 à 3 saisons. Se précipiter est la principale cause d'abandon et de blessures en compétition.",
    source: "IFSS / Mush with P.R.I.D.E.",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Chiens et chaleur mentale",
    title: "Le stress pré-compétition augmente la température interne",
    text: "L'excitation et le stress du départ élèvent la température interne du chien avant même l'effort. Un chien qui démarre déjà 'chaud mentalement' surchauffera plus vite. La gestion du stress pré-départ (lieu calme, routine stable, contact rassurant) fait partie de la préparation.",
    source: "ISDVMA",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Nourriture en course",
    title: "La viande de bœuf + suif : ration classique des mushers",
    text: "De nombreux mushers de longue distance nourrissent leurs chiens avec un mélange de viande hachée (bœuf, mouton, saumon), de suif et de croquettes trempées pendant la course. Ce mélange est dense en énergie, appétent même par grand froid et facilement réchauffé avec de l'eau chaude.",
    source: "Iditarod Vet Guidelines",
    url: "https://iditarod.com/race/veterinary/"
  },
  {
    label: "Après une blessure",
    title: "La reprise après blessure : plus progressive que la montée en charge",
    text: "Après une blessure de tendon ou ligament, la reprise doit être 2 à 3 fois plus lente que la montée en charge initiale. Le tissu cicatriciel est moins élastique que le tissu original. Une reprise trop rapide donne une récidive presque assurée dans les 3 mois.",
    source: "ISDVMA / Physiothérapie vétérinaire",
    url: "https://sleddogsport.net/"
  },
  {
    label: "Évaluation régulière",
    title: "Réévaluer son plan toutes les 4 semaines",
    text: "Un plan d'entraînement n'est pas gravé dans le marbre. Évalue les progrès (vitesse, récupération, comportement) toutes les 4 semaines et ajuste. Un chien qui progresse vite peut monter la charge plus rapidement. Un chien qui stagne ou régresse nécessite une pause ou un changement d'approche.",
    source: "IFSS Athlete Guidelines",
    url: "https://sleddogsport.net/"
  }
];

function getAdviceCategory(label) {
  const l = (label || "").toLowerCase();
  if (/nutrition|alimentation|hydrat|eau|electro|omega|nourriture|poids|calcium|microbiote/.test(l)) return "Nutrition";
  if (/blessure|tendin|hernie|pattes|coussin|genciv|veter|premiers secours|bilan|boiter|santé|os|dent|griff|oreill|massage|antidoul|inflam|truffe|fourrure|mue|parasite|vaccin|vermif/.test(l)) return "Santé";
  if (/froid|chaleur|altitude|neige|boue|meteo|gel|temperat|soleil|canicul|hiver|trail|eau froide/.test(l)) return "Conditions";
  if (/echauf|recuper|cardio|foulee|progressiv|repos|endur|effort|sommeil|surentra|charge|lombes|muscu|respir|raideur|stress|acide|lactique/.test(l)) return "Entraînement";
  if (/attelage|harnais|ligne|crochet|ceinture|securit|materiel|transport|botte|laisse|crochets/.test(l)) return "Équipement";
  if (/course|competition|sprint|bikejor|canicross|ski|dryland|bivouac|nuit|acclimat|nourriture en course|controle veter/.test(l)) return "Compétition";
  if (/comportement|education|jeune|communicat|meute|psycholog|plaisir|forge|apprentissage|commande|chien de tête|langue corporel|objectif|evaluat|equipe/.test(l)) return "Comportement";
  return "Général";
}

let activeAdviceCategory = "";

function renderWebAdvice() {
  const list = document.querySelector('[data-list="webAdvice"]');
  if (!list) return;

  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const periodIndex = Math.floor(daysSinceEpoch / 2);
  const total = ADVICE_BANK.length;

  if (activeAdviceCategory) {
    // Mode filtre : affiche tous les conseils de la catégorie
    const filtered = ADVICE_BANK.filter((t) => getAdviceCategory(t.label) === activeAdviceCategory);
    list.innerHTML = filtered.length === 0
      ? `<p class="empty-state">Aucun conseil dans cette catégorie.</p>`
      : filtered.map((tip) => `
          <article class="advice-card web-tip">
            <span>${tip.label}</span>
            <h2>${tip.title}</h2>
            <p>${tip.text}</p>
            <a href="${tip.url}" target="_blank" rel="noopener noreferrer">${tip.source} ↗</a>
          </article>
        `).join("");
  } else {
    // Mode rotation : 2 conseils qui changent tous les 2 jours
    const idx1 = periodIndex % total;
    const idx2 = (periodIndex + 1) % total;
    const todayTips = [ADVICE_BANK[idx1], ADVICE_BANK[idx2]];
    const nextChangeDay = (periodIndex + 1) * 2;
    const daysLeft = nextChangeDay - daysSinceEpoch;
    const nextLabel = daysLeft <= 1 ? "Demain" : `Dans ${daysLeft} jours`;
    list.innerHTML = `
      <div class="advice-rotation-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
        Nouveau conseil : ${nextLabel} · ${periodIndex % total + 1}/${total}
      </div>
      ${todayTips.map((tip) => `
        <article class="advice-card web-tip">
          <span>${tip.label}</span>
          <h2>${tip.title}</h2>
          <p>${tip.text}</p>
          <a href="${tip.url}" target="_blank" rel="noopener noreferrer">${tip.source} ↗</a>
        </article>
      `).join("")}
    `;
  }
}

function renderPlan() {
  renderPlanInsights();
}

function buildPlan() {
  const context = getPlanContext();
  const base = Math.round((state.raceType === "Sprint" ? 18 : state.raceType === "Longue distance" ? 62 : 38) * context.volumeFactor);
  const peak = Math.max(base + 16, Math.round(state.raceKm * (state.raceType === "Sprint" ? 0.9 : 1.15) * context.volumeFactor));

  return Array.from({ length: 8 }, (_, index) => {
    const isRest = (index + 1) % 4 === 0 || (context.daysToRace <= 10 && index === 0);
    const rawKm = isRest ? Math.round(base * 0.72 + index * 2) : Math.round(base + ((peak - base) / 7) * index);
    const km = Math.max(4, rawKm);
    const focus = getWeekFocus(index, isRest, context);
    return { label: index === 0 ? "Cette semaine" : `Semaine ${index + 1}`, km, focus, level: isRest ? "light" : context.riskLevel };
  });
}

function getWeekFocus(index, isRest, context = getPlanContext()) {
  const summer = state.seasonMode === "summer";
  if (context.daysToRace <= 10 && index === 0) return "Course proche: affutage, volume reduit, rappel court et team fraiche.";
  if (context.weatherRisk) return `${context.weatherRisk}. Seance adaptee: ${summer ? "canicross facile, eau, ombre et coussinets." : "allure controlee, pattes et recuperation."}`;
  if (isRest) return summer ? "Semaine legere, coussinets, hydratation, chaleur a surveiller." : "Semaine legere, controle fatigue, soins des pattes.";
  if (state.raceType === "Sprint") return summer ? "Intervalles courts tot le matin, departs propres, recuperation active." : index % 2 ? "Intervalles courts, departs, recuperation active." : "Vitesse propre, virages, ordres leaders.";
  if (state.raceType === "Longue distance") return summer ? "Rando-course tractee, pauses eau, allure economique." : index % 2 ? "Back-to-back, alimentation, allure economique." : "Sortie longue, pause controlee, mental de team.";
  return summer ? "Endurance facile, denivele doux, traction reguliere." : index % 2 ? "Cotes courtes, endurance, retour calme." : "Endurance progressive, allure stable.";
}

function getNextWorkout() {
  // Aucune sortie → première séance douce
  if (!state.runs || state.runs.length === 0) {
    return {
      title: "Première sortie",
      text: "5 km faciles pour évaluer la forme de l'attelage.",
      km: 5
    };
  }

  // Moyenne des 3 dernières sorties
  const recent = state.runs.slice(0, 3);
  const avgKm = recent.reduce((s, r) => s + Number(r.km || 0), 0) / recent.length;

  // +10 % par rapport à la moyenne récente, plafonné progressivement
  const targetKm = state.raceType === "Sprint" ? 18 : state.raceType === "Longue distance" ? 62 : 38;
  let nextKm = Math.round(avgKm * 1.10);
  nextKm = Math.max(4, Math.min(nextKm, Math.round(avgKm * 1.20 + 2), targetKm));

  // Réduction si météo défavorable ou course imminente
  const context = getPlanContext();
  if (context.volumeFactor < 1) nextKm = Math.max(4, Math.round(nextKm * context.volumeFactor));

  // Type de séance selon discipline
  const label = state.raceType === "Sprint" ? "Intervalles courts"
    : state.raceType === "Longue distance" ? "Sortie longue économique"
    : "Endurance progressive";

  // Alerte récupération
  const lastRecov = state.runs[0]?.recovery || "";
  const recovNote = (lastRecov === "Difficile" || lastRecov === "A surveiller")
    ? " ⚠️ Récupération à surveiller." : "";

  return {
    title: label,
    text: `${nextKm} km recommandés (moyenne récente : ${Math.round(avgKm)} km).${recovNote}`,
    km: nextKm
  };
}

function getPlanContext() {
  const nextRace = getNextAgendaRace();
  const daysToRace = nextRace ? daysUntil(nextRace.date) : daysUntil(state.raceDate);
  const weather = state.planWeather;
  const weekKm = getWeekKm();
  const targetKm = state.raceType === "Sprint" ? 18 : state.raceType === "Longue distance" ? 62 : 38;
  const loadRatio = targetKm ? weekKm / targetKm : 0;
  let volumeFactor = 1;
  let weatherRisk = "";
  let riskLevel = "ok";

  if (daysToRace <= 10) {
    volumeFactor *= 0.65;
    riskLevel = "light";
  }

  if (loadRatio > 1.25) {
    volumeFactor *= 0.82;
    riskLevel = "light";
  }

  if (weather) {
    if (weather.temperature >= 18 && state.seasonMode === "summer") {
      weatherRisk = `Chaleur ${Math.round(weather.temperature)} C`;
      volumeFactor *= weather.temperature >= 24 ? 0.55 : 0.72;
      riskLevel = "danger";
    } else if (weather.temperature >= 12 && state.seasonMode === "summer") {
      weatherRisk = `Temperature douce ${Math.round(weather.temperature)} C`;
      volumeFactor *= 0.9;
      riskLevel = "light";
    }

    if (weather.wind >= 35) {
      weatherRisk = `Vent fort ${Math.round(weather.wind)} km/h`;
      volumeFactor *= 0.82;
      riskLevel = "light";
    }

    if (weather.precipitation >= 2) {
      weatherRisk = `Pluie/neige ${weather.precipitation} mm`;
      volumeFactor *= 0.85;
      riskLevel = "light";
    }
  }

  return {
    nextRace,
    daysToRace,
    weekKm,
    loadRatio,
    weather,
    weatherRisk,
    riskLevel,
    volumeFactor: Math.max(0.45, Math.min(1.15, volumeFactor))
  };
}

function renderPlanInsights() {
  const list = document.querySelector('[data-list="planInsights"]');
  if (!list) return;

  const context = getPlanContext();
  const weekActions = getWeeklyPlanActions(context);
  const weatherText = context.weather
    ? `${Math.round(context.weather.temperature)} C, vent ${Math.round(context.weather.wind)} km/h, pluie ${context.weather.precipitation} mm`
    : "Meteo en attente de localisation";
  const raceText = context.nextRace
    ? `${context.nextRace.name} dans ${Math.max(0, context.daysToRace)} jours`
    : `Objectif dans ${Math.max(0, context.daysToRace)} jours`;
  const updateText = state.planWeatherUpdatedAt
    ? `MAJ ${formatDateTime(state.planWeatherUpdatedAt)}`
    : "MAJ automatique";

  list.innerHTML = `
    <article class="plan-signal ${context.riskLevel}">
      <span>Date du jour</span>
      <b>${formatFullDate(new Date().toISOString().slice(0, 10))}</b>
      <small>${raceText}</small>
    </article>
    <article class="plan-signal ${context.riskLevel}">
      <span>Meteo</span>
      <b>${weatherText}</b>
      <small>${context.weatherRisk || updateText}</small>
    </article>
    <article class="plan-signal ${context.loadRatio > 1.25 ? "danger" : "ok"}">
      <span>Charge</span>
      <b>${context.weekKm.toFixed(1)} km cette semaine</b>
      <small>${context.loadRatio > 1.25 ? "Plan allege automatiquement." : "Plan ajuste selon tes sorties."}</small>
    </article>
  `;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("fr-CH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getCoachInsight() {
  const alerts = buildAlerts();
  const weekKm = getWeekKm();
  if (alerts.some((alert) => alert.level === "danger")) {
    return { title: "A surveiller", text: alerts.find((alert) => alert.level === "danger").text };
  }
  if (weekKm < 20) return { title: "Relancer doucement", text: "Volume bas cette semaine. Prevoir une sortie facile avant d'augmenter." };
  return { title: "Progression propre", text: "Charge stable. Garde une semaine legere toutes les 3 a 4 semaines." };
}

function getDogAdvice(dog, recentKm, lastRun) {
  if (recentKm > 45) return `${dog.name} a beaucoup travaille recemment. Priorite a une sortie courte, controle des pattes et recuperation.`;
  if (lastRun && lastRun.recovery === "A surveiller") return `${dog.name} a montre une recuperation a surveiller. Note appetit, demarche et motivation avant la prochaine seance.`;
  if (recentKm < 10) return `${dog.name} a peu de kilometres recents. Reprise progressive, sortie facile et observation de la traction.`;
  return `${dog.name} est dans une charge coherente. Continue a noter energie, pattes, hydratation et recuperation apres chaque sortie.`;
}

function getDogHealthSignal(dog, runs, recentKm, avgEnergy) {
  const lastRun = runs[0];
  if (!lastRun) {
    return {
      level: "light",
      title: "Base a creer",
      text: `${dog.name} n'a pas encore assez de donnees. Note chaque sortie pour obtenir une analyse fiable.`
    };
  }
  if (!lastRun.hydrated || !lastRun.paws || lastRun.recovery === "Difficile") {
    return {
      level: "danger",
      title: "Surveillance",
      text: "Faire une sortie tres facile ou repos, puis verifier pattes, hydratation, appetit et locomotion."
    };
  }
  if (recentKm > 45 || avgEnergy < 3) {
    return {
      level: "light",
      title: "Charge a doser",
      text: "Le chien travaille bien mais la prochaine seance doit rester controlee pour garder de la fraicheur."
    };
  }
  return {
    level: "ok",
    title: "Pret",
    text: "Les indicateurs sont propres. Garder une progression reguliere et surveiller la recuperation apres effort."
  };
}

function getDogReadiness(dog) {
  const runs = state.runs.filter((run) => run.team.includes(dog.id));
  const lastRun = runs[0];
  const recentKm = getDogRecentKm(dog.id);
  const avgEnergy = runs.length ? runs.reduce((sum, run) => sum + Number(run.energy || 4), 0) / runs.length : 4;
  const age = getDogAge(dog);

  if (dog.limitation) {
    return {
      level: "danger",
      title: "Vigilance",
      text: dog.limitation
    };
  }
  if (lastRun && (!lastRun.paws || !lastRun.hydrated || lastRun.recovery === "Difficile")) {
    return {
      level: "danger",
      title: "Repos conseille",
      text: "Controle pattes, hydratation et recuperation avant la prochaine sortie."
    };
  }
  if (recentKm > 45 || avgEnergy <= 2.8) {
    return {
      level: "light",
      title: "A doser",
      text: "Charge ou energie a surveiller, privilegier facile."
    };
  }
  if (age < 2 || age >= 9) {
    return {
      level: "light",
      title: "Progressif",
      text: "Adapter volume et intensite selon l'age."
    };
  }
  if (recentKm < 6) {
    return {
      level: "light",
      title: "Reprise",
      text: "Remettre au travail progressivement."
    };
  }
  return {
    level: "ok",
    title: "Pret",
    text: "Bon candidat pour l'attelage."
  };
}

function getWeeklyPlanActions(context) {
  if (context.weatherRisk) {
    return {
      level: "danger",
      title: "Adapter a la meteo",
      text: "Reduire l'intensite, choisir les heures fraiches et transformer la seance dure en endurance facile."
    };
  }
  if (context.daysToRace <= 10) {
    return {
      level: "light",
      title: "Affuter sans fatiguer",
      text: "Garder une sortie courte avec quelques relances, puis privilegier repos, pattes et materiel."
    };
  }
  if (context.loadRatio > 1.25) {
    return {
      level: "danger",
      title: "Semaine trop chargee",
      text: "Baisser le volume de 20 a 30 pourcent et laisser les chiens recuperer avant de remettre de l'intensite."
    };
  }
  if (context.weekKm < 12) {
    return {
      level: "light",
      title: "Relancer proprement",
      text: "Programmer une sortie facile, puis augmenter seulement si la recuperation reste bonne."
    };
  }
  return {
    level: "ok",
    title: "Progression stable",
    text: "Conserver le plan, noter la meteo apres sortie et ajuster la prochaine seance selon l'energie de la team."
  };
}

function buildAlerts() {
  const alerts = [];
  state.dogs.forEach((dog) => {
    const load = getDogRecentKm(dog.id);
    const runs = state.runs.filter((run) => run.team.includes(dog.id));
    const lastRun = runs[0];
    const readiness = getDogReadiness(dog);
    if (load > 45) alerts.push({ level: "danger", label: dog.name, text: `${dog.name} est a ${load.toFixed(1)} km sur 7 jours. Prevoir repos ou recuperation.` });
    if (load < 6) alerts.push({ level: "info", label: dog.name, text: `${dog.name} a peu travaille cette semaine. Bon candidat pour une sortie facile.` });
    if (lastRun && !lastRun.paws) alerts.push({ level: "danger", label: `Pattes ${dog.name}`, text: `Controle les coussinets de ${dog.name} avant la prochaine sortie.` });
    if (lastRun && Number(lastRun.energy || 5) <= 2) alerts.push({ level: "danger", label: `Energie ${dog.name}`, text: `${dog.name} a eu une energie basse. Prevoir repos ou sortie tres facile.` });
    if (lastRun && lastRun.recovery === "A surveiller") alerts.push({ level: "info", label: `Recuperation ${dog.name}`, text: `Recuperation a surveiller pour ${dog.name}. Note appetit, demarche et motivation.` });
    if (dog.limitation) alerts.push({ level: "danger", label: `Suivi ${dog.name}`, text: `${dog.name} a un point de vigilance note : ${dog.limitation}` });
    if (state.selectedDogIds.includes(dog.id) && readiness.level === "danger") {
      alerts.push({ level: "danger", label: "Attelage", text: `${dog.name} est selectionne mais son statut conseille prudence ou repos.` });
    }
  });
  const heatRisk = state.seasonMode === "summer" && state.runs[0]?.weather?.match(/[2-9][0-9]/);
  if (heatRisk) alerts.push({ level: "danger", label: "Chaleur", text: "Temperature elevee detectee. Eviter intensite, verifier coussinets et hydrater." });
  if (state.runs[0] && !state.runs[0].hydrated) alerts.push({ level: "danger", label: "Hydratation", text: "Derniere sortie marquee avec hydratation incomplete." });
  const context = getPlanContext();
  if (context.weatherRisk) alerts.push({ level: "danger", label: "Meteo", text: context.weatherRisk });
  if (context.daysToRace <= 7) alerts.push({ level: "info", label: "Course", text: "Course proche. Diminuer le volume, garder les chiens frais et verifier le materiel." });
  return alerts.slice(0, 7);
}

function getDogRecentKm(id, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  return state.runs
    .filter(r => r.date && new Date(`${r.date}T12:00:00`).getTime() >= cutoff && r.team.includes(id))
    .reduce((sum, r) => sum + Number(r.km || 0), 0);
}

function getDogFatigueIndex(id) {
  const km7 = getDogRecentKm(id, 7);
  const targetWeekly = state.raceType === "Sprint" ? 18 : state.raceType === "Longue distance" ? 62 : 38;
  const perDog = state.dogs.length > 0 ? targetWeekly / state.dogs.length : targetWeekly;
  return perDog > 0 ? km7 / perDog : 0;
}

function getDogDaysSinceRest(id) {
  const goodRecov = ["Bonne", "Excellente"];
  const run = state.runs.find(r => r.team.includes(id) && goodRecov.includes(r.recovery));
  if (!run || !run.date) return null;
  const diff = Math.round((Date.now() - new Date(`${run.date}T12:00:00`).getTime()) / 86400000);
  return diff;
}

function getWeeklyTotals() {
  return Array.from({ length: 6 }, (_, index) => {
    const end = new Date();
    end.setDate(end.getDate() - index * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const km = state.runs
      .filter((run) => {
        const date = new Date(`${run.date}T12:00:00`);
        return date >= start && date <= end;
      })
      .reduce((sum, run) => sum + Number(run.km), 0);
    return { label: index === 0 ? "S" : `S-${index}`, km };
  }).reverse();
}

function getRaceReadiness() {
  const plan = buildPlan();
  const target = plan[0]?.km || 0;
  const weekKm = getWeekKm();
  const ratio = target ? weekKm / target : 0;
  if (ratio > 1.25) return "Tu es au-dessus du volume prevu. Pense recuperation et controle pattes.";
  if (ratio < 0.65) return "Tu es sous le volume prevu. Reprendre sans forcer avec une sortie facile.";
  return "Tu es dans la bonne zone. Priorite a la regularite et a une team fraiche.";
}

function normalizeCountry(race) {
  const raw = `${race.location || ""} ${race.region || ""}`.toLowerCase();
  if (/france|francais|alpes.fran|bellegarde|villedieu|jura/.test(raw)) return "🇫🇷 France";
  if (/suisse|switzerland|valais|ardon|sion|zurich|berne|geneve/.test(raw)) return "🇨🇭 Suisse";
  if (/norv[eè]g|norway|alta|tromso|finnmark/.test(raw)) return "🇳🇴 Norvège";
  if (/su[eè]de|sweden|stromsund|lulea|umea/.test(raw)) return "🇸🇪 Suède";
  if (/alaska|iditarod|yukon.*alaska|usa|united states/.test(raw)) return "🇺🇸 États-Unis";
  if (/canada|yukon|whitehorse|quebec|ontario/.test(raw)) return "🇨🇦 Canada";
  if (/italie|italy|italia/.test(raw)) return "🇮🇹 Italie";
  if (/royaume.uni|uk|england|scotland|midlands|british/.test(raw)) return "🇬🇧 Royaume-Uni";
  if (/pays.bas|netherlands|nederland/.test(raw)) return "🇳🇱 Pays-Bas";
  if (/irlande|ireland/.test(raw)) return "🇮🇪 Irlande";
  if (/allemagne|germany|deutschland/.test(raw)) return "🇩🇪 Allemagne";
  if (/belgique|belgium|belgi/.test(raw)) return "🇧🇪 Belgique";
  if (/espagne|spain|espana/.test(raw)) return "🇪🇸 Espagne";
  if (/autriche|austria|[oö]sterreich/.test(raw)) return "🇦🇹 Autriche";
  if (/finlande|finland|suomi/.test(raw)) return "🇫🇮 Finlande";
  if (/russie|russia|russland/.test(raw)) return "🇷🇺 Russie";
  if (/pologne|poland|polska/.test(raw)) return "🇵🇱 Pologne";
  if (/tch[eè]que|czech|moravie/.test(raw)) return "🇨🇿 Rép. Tchèque";
  if (/europe.centrale|central.europe/.test(raw)) return "🌍 Europe centrale";
  if (/international|monde|world|europe/.test(raw)) return "🌍 International";
  if (/a.verifier|signalee|unknown/.test(raw)) return "📍 À localiser";
  const loc = (race.location || "").trim();
  return loc.length > 0 && loc.length <= 30 ? `📍 ${loc}` : "📍 Autre";
}

function renderRaceSearch() {
  const list = document.querySelector('[data-list="raceSearchResults"]');
  if (!list) return;

  const region = document.querySelector("#race-search-region")?.value.trim().toLowerCase() || "";
  const type = document.querySelector("#race-search-type")?.value || "";
  const distance = document.querySelector("#race-search-distance")?.value || "";
  const surface = document.querySelector("#race-search-surface")?.value || "";
  const reliability = document.querySelector("#race-search-reliability")?.value || "";
  const period = document.querySelector("#race-search-period")?.value || "";
  const now = new Date(); now.setHours(0, 0, 0, 0);
  // Exclure les courses en attente de validation admin
  const reports = state.missingRaceReports
    .filter((r) => r.status !== "pending")
    .map((report) => ({
    ...report,
    type: report.type || "A verifier",
    distance: Number(report.distance || 0),
    reliability: "user",
    surface: report.surface || "A verifier",
    source: "Signalee",
    notes: report.notes || ""
  }));
  // Filtrer les courses remote : seulement approved ou sans status (catalogue officiel)
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const approvedRemote = remoteRaceCatalog.filter((r) => !r.status || r.status === "approved");
  // Catalogue local : exclure les entrées sans date ET les courses cachées par l'admin
  const hiddenIds = new Set(state.hiddenRaceIds || []);
  const catalogWithDates = raceCatalog.filter((r) => r.date && !hiddenIds.has(r.id));
  const mergedRaces = mergeRaceSources([...approvedRemote, ...catalogWithDates, ...reports]);
  const results = mergedRaces.filter((race) => {
    if (!race.date) return false; // n'affiche que les courses avec une date précise
    const regionText = `${race.region} ${race.location} ${race.name} ${race.source} ${race.notes}`.toLowerCase();
    const typeMatch = !type || race.type === type || (type === "Dryland" && ["Canicross", "Dryland"].includes(race.type));
    const regionMatch = !region || regionText.includes(region);
    const surfaceMatch = !surface || String(race.surface || "").includes(surface);
    const reliabilityMatch = !reliability || race.reliability === reliability;
    const distanceMatch =
      !distance ||
      (distance === "short" && Number(race.distance || 0) <= 15) ||
      (distance === "medium" && Number(race.distance || 0) > 15 && Number(race.distance || 0) <= 80) ||
      (distance === "long" && Number(race.distance || 0) > 80);
    let periodMatch = true;
    if (period && race.date) {
      const raceDay = new Date(race.date); raceDay.setHours(0, 0, 0, 0);
      const ms90  = 90  * 24 * 3600 * 1000;
      const ms180 = 180 * 24 * 3600 * 1000;
      if (period === "future")   periodMatch = raceDay >= now;
      else if (period === "3months") periodMatch = raceDay >= now && raceDay <= new Date(now.getTime() + ms90);
      else if (period === "6months") periodMatch = raceDay >= now && raceDay <= new Date(now.getTime() + ms180);
      else if (period === "past")    periodMatch = raceDay < now;
    } else if (period === "past" && !race.date) {
      periodMatch = false; // pas de date = pas une archive
    }
    return typeMatch && regionMatch && surfaceMatch && reliabilityMatch && distanceMatch && periodMatch;
  }).sort((a, b) => getReliabilityRank(a.reliability) - getReliabilityRank(b.reliability));

  const radarMeta = ""; // radar supprimé

  // Helper : construit la carte HTML d'une course
  function buildRaceCard(race, pinned = false) {
    const dateText = formatFullDate(race.date);
    const dLeft = daysUntil(race.date);
    const status = dLeft < 0 ? "Terminée" : `J-${dLeft}`;
    const pinnedBadge = pinned ? `<span class="race-pinned-badge">⭐ Selectionnee</span>` : "";
    const adminBtns = isAdmin ? `
      <button class="admin-race-edit-btn text-button" data-admin-edit="${race.id}" type="button" title="Modifier">✏️</button>
      <button class="admin-race-delete-btn text-button" data-admin-delete="${race.id}" type="button" title="Supprimer">🗑️</button>
    ` : "";
    return `
      <article class="race-result ${race.reliability || "calendar"}${pinned ? " pinned" : ""}" data-race-id="${race.id}">
        ${pinnedBadge}
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px">
          <div>
            <span>${status} · ${race.source} · ${getReliabilityLabel(race.reliability)}</span>
            <h3>${race.name}</h3>
            <p>${dateText} · ${race.location}</p>
          </div>
          <div style="display:flex;gap:2px;flex-shrink:0">${adminBtns}</div>
        </div>
        <strong>${race.type}</strong>
        <div class="agenda-meta">
          <span>${race.distance ? `${race.distance} km` : "Distance variable"}</span>
          <span>${race.surface || "Surface variable"}</span>
        </div>
        ${race.notes ? `<p>${race.notes}</p>` : ""}
        <div class="race-result-actions">
          <button class="secondary-button" data-open-race-source="${race.id}" type="button">Source</button>
          <button class="secondary-button${state.raceInterests[race.id] ? " btn-interested" : ""}" data-race-interest="${race.id}" type="button">${state.raceInterests[race.id] ? "⭐ Interesse" : "Je suis interesse"}</button>
          <button class="${state.agenda.some(a => a.sourceId === race.id) ? "btn-participe" : "primary-button"}" data-import-race="${race.id}" type="button">${state.agenda.some(a => a.sourceId === race.id) ? "✓ Participe" : "Ajouter"}</button>
        </div>
        ${renderRaceInterestSummary(race)}
        <div class="admin-edit-form hidden" data-edit-form="${race.id}">
          <input class="admin-edit-name"     placeholder="Nom"       value="${race.name}" />
          <input class="admin-edit-date"     type="date"             value="${race.date}" />
          <input class="admin-edit-location" placeholder="Lieu"      value="${race.location || ""}" />
          <input class="admin-edit-distance" type="number" placeholder="Distance km" value="${race.distance || ""}" />
          <input class="admin-edit-notes"    placeholder="Notes"     value="${race.notes || ""}" />
          <div style="display:flex;gap:8px;margin-top:6px">
            <button class="primary-button admin-edit-save" data-save-edit="${race.id}" type="button">💾 Enregistrer</button>
            <button class="secondary-button admin-edit-cancel" data-cancel-edit="${race.id}" type="button">Annuler</button>
          </div>
        </div>
      </article>
    `;
  }

  if (results.length === 0) {
    list.innerHTML = radarMeta + `<p class="empty-state">Aucune course trouvee. Essaie une region plus large comme Europe, USA, Canada, Suede ou Amundsen.</p>`;
  } else {
    // Séparer les courses sélectionnées (intérêt marqué) des autres
    const pinned = results.filter((r) => state.raceInterests[r.id]);
    const unpinned = results.filter((r) => !state.raceInterests[r.id]);

    // Grouper les non-sélectionnées par pays/région
    const byCountry = {};
    unpinned.forEach((race) => {
      const country = normalizeCountry(race);
      if (!byCountry[country]) byCountry[country] = [];
      byCountry[country].push(race);
    });

    // Section courses sélectionnées
    let pinnedHtml = "";
    if (pinned.length > 0) {
      pinnedHtml = `
        <div class="pinned-races-section">
          <p class="pinned-races-title">⭐ Mes courses selectionnees (${pinned.length})</p>
          ${pinned.map((r) => buildRaceCard(r, true)).join("")}
        </div>
      `;
    }

    // Section par pays — accordéon (fermé par défaut)
    const countriesHtml = Object.entries(byCountry)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, races]) => `
        <div class="race-country-group">
          <button class="race-country-header" type="button" data-country="${country}" aria-expanded="false">
            <svg class="country-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
            <h3>${country}</h3>
            <span>${races.length} course${races.length > 1 ? "s" : ""}</span>
          </button>
          <div class="race-country-body" hidden>
            ${races.map((r) => buildRaceCard(r, false)).join("")}
          </div>
        </div>
      `).join("");

    list.innerHTML = radarMeta + pinnedHtml + (countriesHtml || "");

    // Accordéon : toggle au clic sur l'en-tête pays
    list.querySelectorAll(".race-country-header[data-country]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const body = btn.nextElementSibling;
        const open = !body.hidden;
        body.hidden = open;
        btn.setAttribute("aria-expanded", String(!open));
        btn.classList.toggle("open", !open);
      });
    });
  }

  list.querySelectorAll("[data-open-race-source]").forEach((button) => {
    button.addEventListener("click", () => {
      const race = mergeRaceSources([...remoteRaceCatalog, ...raceCatalog, ...state.missingRaceReports])
        .find((item) => item.id === button.dataset.openRaceSource);
      if (race?.url) window.open(race.url, "_blank", "noopener");
    });
  });

  list.querySelectorAll("[data-import-race]").forEach((button) => {
    button.addEventListener("click", () => importRaceToAgenda(button.dataset.importRace));
  });

  list.querySelectorAll("[data-race-interest]").forEach((button) => {
    button.addEventListener("click", () => toggleRaceInterest(button.dataset.raceInterest));
  });

  // ── Boutons admin : supprimer ─────────────────────────────────────────
  if (isAdmin) {
    list.querySelectorAll("[data-admin-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.adminDelete;
        const article = btn.closest("article");
        const name = article?.querySelector("h3")?.textContent || id;

        if (btn.dataset.confirming === "1") {
          await adminDeleteRace(id);
          renderRaceSearch();
        } else {
          btn.dataset.confirming = "1";
          btn.textContent = "⚠️ Confirmer ?";
          setTimeout(() => { btn.dataset.confirming = "0"; btn.textContent = "🗑️"; }, 5000);
        }
      });
    });

    // ── Boutons admin : ouvrir formulaire édition ────────────────────────
    list.querySelectorAll("[data-admin-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.adminEdit;
        const form = list.querySelector(`[data-edit-form="${id}"]`);
        if (form) form.classList.toggle("hidden");
      });
    });

    list.querySelectorAll("[data-cancel-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const form = btn.closest(".admin-edit-form");
        if (form) form.classList.add("hidden");
      });
    });

    list.querySelectorAll("[data-save-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.saveEdit;
        const form = btn.closest(".admin-edit-form");
        const updates = {
          name:     form.querySelector(".admin-edit-name").value.trim(),
          date:     form.querySelector(".admin-edit-date").value,
          location: form.querySelector(".admin-edit-location").value.trim(),
          distance: Number(form.querySelector(".admin-edit-distance").value) || 0,
          notes:    form.querySelector(".admin-edit-notes").value.trim()
        };
        await adminUpdateRace(id, updates);
        renderRaceSearch();
      });
    });
  }

  fetchCommunityInterests(results.map((race) => race.id));
}

// ── Logique admin : supprimer une course ──────────────────────────────────────
async function adminDeleteRace(id) {
  // 1. Course dans Supabase (remoteRaceCatalog) ?
  const isRemote = remoteRaceCatalog.some((r) => r.id === id);
  if (isRemote && supabase) {
    const { error } = await supabase.from("mushtrack_races").delete().eq("id", id);
    if (!error) {
      remoteRaceCatalog = remoteRaceCatalog.filter((r) => r.id !== id);
    } else {
      alert("Erreur Supabase : " + error.message); return;
    }
  }
  // 2. Signalement utilisateur dans state ?
  const isReport = state.missingRaceReports.some((r) => r.id === id);
  if (isReport) {
    state.missingRaceReports = state.missingRaceReports.filter((r) => r.id !== id);
  }
  // 3. Catalogue local (raceCatalog) → masquer via hiddenRaceIds
  if (!isRemote && !isReport) {
    state.hiddenRaceIds = [...(state.hiddenRaceIds || []), id];
  }
  delete state.raceInterests[id];
  saveState();
  showSyncBadge("🗑️ Course supprimée");
}

// ── Logique admin : modifier une course ──────────────────────────────────────
async function adminUpdateRace(id, updates) {
  // 1. Course dans Supabase ?
  const isRemote = remoteRaceCatalog.some((r) => r.id === id);
  if (isRemote && supabase) {
    const { error } = await supabase.from("mushtrack_races").update(updates).eq("id", id);
    if (!error) {
      const idx = remoteRaceCatalog.findIndex((r) => r.id === id);
      if (idx !== -1) remoteRaceCatalog[idx] = { ...remoteRaceCatalog[idx], ...updates };
    } else { alert("Erreur Supabase : " + error.message); return; }
  }
  // 2. Signalement ?
  const reportIdx = state.missingRaceReports.findIndex((r) => r.id === id);
  if (reportIdx !== -1) {
    state.missingRaceReports[reportIdx] = { ...state.missingRaceReports[reportIdx], ...updates };
    saveState();
  }
  // 3. Catalogue local → pousser une version modifiée dans Supabase comme approved
  if (!isRemote && reportIdx === -1 && supabase) {
    const original = raceCatalog.find((r) => r.id === id);
    if (original) {
      const merged = { ...original, ...updates, id: id + "-edited", status: "approved" };
      // Masque l'original et insère la version éditée dans Supabase
      state.hiddenRaceIds = [...(state.hiddenRaceIds || []), id];
      await supabase.from("mushtrack_races").upsert([merged], { onConflict: "id" });
      saveState();
      // Recharge le catalogue remote
      fetchRaceRadar();
    }
  }
  showSyncBadge("✅ Course mise à jour");
}

function renderRaceInterestSummary(race) {
  const myName = state.profile.name || "Musher";
  const myRegion = state.profile.region || "";
  const iAmInterested = Boolean(state.raceInterests[race.id]);
  const iAmParticipating = state.agenda.some(a => a.sourceId === race.id);

  const remote = communityInterests[race.id] || { count: 0, interested: [], participants: [] };

  // ── Intéressés ─────────────────────────────────────────────────────────────
  const remoteInterested = remote.interested || [];
  const remoteInterestedHasMe = remoteInterested.some(p => p.name === myName);
  const interestedList = [
    ...remoteInterested.map(p => p.region ? `${p.name} (${p.region})` : p.name),
    ...(iAmInterested && !remoteInterestedHasMe ? [myRegion ? `${myName} (${myRegion})` : myName] : [])
  ];

  // ── Participants ────────────────────────────────────────────────────────────
  const remoteParticipants = remote.participants || [];
  const remoteParticHasMe = remoteParticipants.some(p => p.name === myName);
  const participantsList = [
    ...remoteParticipants.map(p => p.region ? `${p.name} (${p.region})` : p.name),
    ...(iAmParticipating && !remoteParticHasMe ? [myRegion ? `${myName} (${myRegion})` : myName] : [])
  ];

  const hasAnything = interestedList.length > 0 || participantsList.length > 0;
  if (!hasAnything) {
    return `<div class="race-community-summary empty">
      <p>Sois le premier à marquer ton intérêt pour cette course ! ⭐</p>
    </div>`;
  }

  return `<div class="race-community-summary">
    ${participantsList.length > 0 ? `
      <div class="race-community-group participants">
        <span class="community-label">✓ Participe (${participantsList.length})</span>
        <span class="community-names">${participantsList.join(" · ")}</span>
      </div>` : ""}
    ${interestedList.length > 0 ? `
      <div class="race-community-group interested">
        <span class="community-label">⭐ Intéressé (${interestedList.length})</span>
        <span class="community-names">${interestedList.join(" · ")}</span>
      </div>` : ""}
  </div>`;
}

async function toggleRaceInterest(id) {
  const merged = mergeRaceSources([...remoteRaceCatalog, ...raceCatalog, ...state.missingRaceReports]);
  const race = merged.find((item) => item.id === id);
  const willBeInterested = !state.raceInterests[id];

  if (state.raceInterests[id]) {
    delete state.raceInterests[id];
  } else {
    state.raceInterests[id] = {
      id,
      date: new Date().toISOString(),
      profileName: state.profile.name || "Musher",
      region: state.profile.region || "",
      status: "interesse"
    };
  }
  saveState();
  renderRaceSearch();

  try {
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raceId: id,
        raceName: race?.name || id,
        deviceId: state.deviceId,
        interested: willBeInterested,
        status: "interesse",
        profile: state.profile
      })
    });
    const data = await response.json();
    if (data.configured && data.interests) {
      communityInterests = { ...communityInterests, ...data.interests };
      communityStatus = "Interets synchronises";
    } else {
      communityStatus = "Interets locaux, base non configuree";
    }
  } catch {
    communityStatus = "Interets locaux, API non joignable";
  } finally {
    renderRaceSearch();
  }
}

async function fetchCommunityInterests(raceIds) {
  const ids = [...new Set(raceIds)].filter(Boolean).slice(0, 80);
  const key = ids.join(",");
  if (!ids.length || communityLoading || communityLastKey === key) return;

  communityLoading = true;
  communityLastKey = key;

  try {
    const response = await fetch(`/api/community?raceIds=${encodeURIComponent(key)}`);
    const data = await response.json();
    if (data.configured && data.interests) {
      communityInterests = data.interests;
      communityStatus = "Interets communautaires actifs";
    } else {
      communityStatus = "Interets locaux, base non configuree";
    }
  } catch {
    communityStatus = "Interets locaux, API non joignable";
  } finally {
    communityLoading = false;
    renderRaceSearch();
  }
}

function mergeRaceSources(items) {
  const map = new Map();
  items.forEach((race) => {
    if (!race?.id) return;
    if (!map.has(race.id)) {
      map.set(race.id, race);
      return;
    }
    const existing = map.get(race.id);
    map.set(race.id, {
      ...existing,
      ...race,
      reliability: getReliabilityRank(race.reliability) < getReliabilityRank(existing.reliability) ? race.reliability : existing.reliability
    });
  });
  return [...map.values()];
}

async function fetchRaceRadar() {
  if (raceRadarLoading) return;
  const region = document.querySelector("#race-search-region")?.value.trim() || "";
  const type = document.querySelector("#race-search-type")?.value || "";
  const distance = document.querySelector("#race-search-distance")?.value || "";
  const surface = document.querySelector("#race-search-surface")?.value || "";
  const reliability = document.querySelector("#race-search-reliability")?.value || "";
  const params = new URLSearchParams({ deep: "1" });
  if (region) params.set("q", region);
  if (type) params.set("type", type);
  if (distance) params.set("distance", distance);
  if (surface) params.set("surface", surface);
  if (reliability) params.set("reliability", reliability);

  raceRadarLoading = true;
  raceRadarStatus = "Recherche web en cours";
  renderRaceSearch();

  try {
    const response = await fetch(`/api/races?${params.toString()}`);
    if (!response.ok) throw new Error(`Radar indisponible (${response.status})`);
    const data = await response.json();
    remoteRaceCatalog = Array.isArray(data.races) ? data.races : [];
    raceRadarUpdatedAt = data.updatedAt || new Date().toISOString();
    const okSources = Array.isArray(data.sourceStatus) ? data.sourceStatus.filter((source) => source.ok).length : 0;
    raceRadarStatus = okSources ? `API Vercel active - ${okSources} source(s) verifiee(s)` : "API Vercel active";
  } catch (error) {
    raceRadarStatus = "API hors ligne - catalogue local";
  } finally {
    raceRadarLoading = false;
    renderRaceSearch();
  }
}

function getReliabilityRank(value) {
  return { official: 1, calendar: 2, watch: 3, user: 4 }[value] || 5;
}

function getReliabilityLabel(value) {
  return {
    official: "Confirmee officielle",
    calendar: "Calendrier public",
    watch: "A surveiller",
    user: "Signalee"
  }[value] || "A verifier";
}

async function importRaceToAgenda(id) {
  const race = mergeRaceSources([...remoteRaceCatalog, ...raceCatalog, ...state.missingRaceReports])
    .find((item) => item.id === id);
  if (!race || !race.date) return;

  const existingIndex = state.agenda.findIndex((item) => item.sourceId === race.id);
  if (existingIndex !== -1) {
    // Déjà inscrit → retirer la participation
    state.agenda.splice(existingIndex, 1);
    saveState();
    renderAgenda();
    // Sync communauté : supprime la participation
    try {
      await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceId: id,
          raceName: race.name,
          deviceId: state.deviceId,
          interested: false,
          status: "participe",
          profile: state.profile
        })
      });
      delete communityInterests[id];
      const fresh = await fetch(`/api/community?raceIds=${encodeURIComponent(id)}`);
      const data = await fresh.json();
      if (data.configured && data.interests) communityInterests = { ...communityInterests, ...data.interests };
    } catch { /* hors ligne, pas grave */ }
    renderRaceSearch();
    showSyncBadge("🗑️ Participation annulée");
    return;
  }

  // Pas encore inscrit → ajouter comme participant
  state.agenda.push({
    id: `race-${Date.now()}`,
    kind: "race",
    sourceId: race.id,
    name: race.name,
    date: race.date,
    type: race.type,
    distance: Number(race.distance || 0),
    priority: "B",
    location: race.location,
    notes: race.notes || ""
  });
  saveState();
  renderAgenda();
  // Sync communauté : enregistre la participation
  try {
    const resp = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raceId: id,
        raceName: race.name,
        deviceId: state.deviceId,
        interested: true,
        status: "participe",
        profile: state.profile
      })
    });
    const data = await resp.json();
    if (data.configured && data.interests) communityInterests = { ...communityInterests, ...data.interests };
  } catch { /* hors ligne, pas grave */ }
  renderRaceSearch();
  showSyncBadge("🏁 Participation confirmée !");
}

// Email de l'admin (toi) — seul ce compte peut approuver les courses
const ADMIN_EMAIL = "morardjuan@hotmail.com";

async function reportMissingRace() {
  const name = prompt("Nom de la course manquante");
  if (!name) return;
  const location = prompt("Pays / region / lieu", "A verifier") || "A verifier";
  const type = prompt("Type: Sprint, Mid-distance, Longue distance, Canicross, Dryland, Skijoring", "A verifier") || "A verifier";
  const date = prompt("Date si connue, format AAAA-MM-JJ", "") || "";
  const url = prompt("Lien source si tu l'as", "") || "";

  const report = {
    id: `pending-${Date.now()}`,
    name,
    date: date || null,
    type,
    distance: 0,
    region: location,
    location,
    url: url || null,
    reliability: "user",
    source: "Signalee",
    surface: "A verifier",
    notes: "",
    status: "pending"
  };

  // Envoi dans Supabase avec status pending
  if (supabase) {
    try {
      await supabase.from("mushtrack_races").insert([{
        id: report.id,
        name: report.name,
        date: report.date,
        type: report.type,
        region: report.region,
        location: report.location,
        url: report.url,
        reliability: "user",
        source: "Signalee",
        surface: "A verifier",
        notes: report.notes,
        status: "pending"
      }]);
      alert(`Merci ! "${name}" a ete soumise et sera visible apres validation par l'administrateur.`);
    } catch (e) {
      alert("Erreur lors de l'envoi. La course sera sauvegardee localement.");
      state.missingRaceReports.unshift(report);
      saveState();
    }
  } else {
    state.missingRaceReports.unshift(report);
    saveState();
    alert(`Merci ! "${name}" a ete soumise et sera visible apres validation.`);
  }
  renderRaceSearch();
}

// Panel admin — visible seulement pour l'admin
function renderAdminPanel() {
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const panel = document.querySelector("#admin-panel");
  if (!panel) return;
  if (!isAdmin) { panel.hidden = true; return; }
  panel.hidden = false;

  if (!supabase) {
    panel.innerHTML = `<div class="admin-panel-box"><p class="empty-state">Supabase non disponible.</p></div>`;
    return;
  }

  panel.innerHTML = `<div class="admin-panel-box"><p style="color:#888;font-size:0.82rem">Chargement des courses en attente…</p></div>`;

  supabase.from("mushtrack_races").select("*").eq("status", "pending").order("created_at", { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        panel.innerHTML = `<div class="admin-panel-box"><p class="empty-state" style="color:#e53e3e">Erreur Supabase : ${error.message}<br><small>Vérifie que la colonne <b>status</b> existe et que les politiques RLS sont actives.</small></p></div>`;
        return;
      }
      if (!data || data.length === 0) {
        panel.innerHTML = `<div class="admin-panel-box"><span class="admin-panel-title">✅ Aucune course en attente</span></div>`;
        return;
      }
      panel.innerHTML = `
        <div class="admin-panel-box">
          <span class="admin-panel-title">🔐 Admin — ${data.length} course(s) en attente</span>
          ${data.map((race) => `
            <article class="admin-race-card">
              <div class="admin-race-info">
                <strong>${race.name}</strong>
                <span>${race.date || "Date inconnue"} · ${race.location || ""} · ${race.type || ""}</span>
                ${race.notes ? `<small>${race.notes}</small>` : ""}
              </div>
              <div class="admin-race-actions">
                <button class="primary-button admin-approve-btn" data-approve="${race.id}" type="button">✅ Approuver</button>
                <button class="danger-button admin-reject-btn" data-reject="${race.id}" type="button">❌ Rejeter</button>
              </div>
            </article>
          `).join("")}
        </div>
      `;

      panel.querySelectorAll("[data-approve]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          btn.textContent = "En cours…";
          const { error } = await supabase.from("mushtrack_races").update({ status: "approved" }).eq("id", btn.dataset.approve);
          if (error) {
            alert("Erreur lors de l'approbation : " + error.message + "\n\nVérifie les politiques RLS dans Supabase (UPDATE doit être autorisé).");
            btn.disabled = false;
            btn.textContent = "✅ Approuver";
            return;
          }
          renderAdminPanel();
          renderRaceSearch();
        });
      });

      panel.querySelectorAll("[data-reject]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm(`Rejeter et supprimer cette course ?`)) return;
          btn.disabled = true;
          btn.textContent = "En cours…";
          const { error } = await supabase.from("mushtrack_races").delete().eq("id", btn.dataset.reject);
          if (error) {
            alert("Erreur lors du rejet : " + error.message + "\n\nVérifie les politiques RLS dans Supabase (DELETE doit être autorisé).");
            btn.disabled = false;
            btn.textContent = "❌ Rejeter";
            return;
          }
          renderAdminPanel();
        });
      });
    });
}

const EVENT_ICONS = { veto:"🏥", osteo:"💆", sortie:"🐕", entrainement:"🏃", materiel:"🛒", course:"🏁", autre:"📌", race:"🏁" };

function renderAgenda() {
  const list = document.querySelector('[data-list="agenda"]');
  if (!list) return;

  const items = [...state.agenda].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (items.length === 0) {
    list.innerHTML = `<p class="empty-state">Agenda vide — ajoute un événement avec + ou valide une course dans l'onglet Course.</p>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const days = daysUntil(item.date);
    const status = days < 0 ? "Passé" : days === 0 ? "Aujourd'hui !" : `Dans ${days} jour${days > 1 ? "s" : ""}`;
    const isRace = item.kind === "race" || item.sourceId;
    const icon = EVENT_ICONS[item.category || (isRace ? "race" : "autre")] || "📌";
    const subtitle = isRace
      ? `${item.type || ""} · ${item.distance ? item.distance + " km" : ""} · ${item.location || ""}`
      : item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : "Événement";
    const notesHtml = item.notes ? `<p style="margin:6px 0 0;font-size:0.82rem;color:#666">${item.notes}</p>` : "";

    // Formulaire d'édition inline
    const catOptions = ["veto","osteo","sortie","entrainement","materiel","course","autre"].map(c =>
      `<option value="${c}" ${(item.category||"autre")===c?"selected":""}>${EVENT_ICONS[c]} ${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
    ).join("");

    return `
      <article class="agenda-item" data-item-id="${item.id}" style="background:#fff;border:1px solid #f0f0f0;border-left:4px solid ${isRace?"#fc4c02":"#4a90d9"};border-radius:10px;padding:14px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:1.6rem;line-height:1">${icon}</span>
          <div style="flex:1;min-width:0">
            <p style="margin:0;font-size:0.75rem;color:${days < 0 ? "#aaa" : days <= 7 ? "#fc4c02" : "#666"};font-weight:600">${status} · ${formatFullDate(item.date)}</p>
            <h3 style="margin:2px 0 4px;font-size:1rem;font-weight:700">${item.name || item.title || "Sans titre"}</h3>
            <p style="margin:0;font-size:0.8rem;color:#888">${subtitle}</p>
            ${notesHtml}
          </div>
        </div>
        ${isRace && item.result ? `
        <div style="margin-top:10px;padding:10px 12px;background:#fff8f5;border-radius:10px;border:1px solid #fcd9c9">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:1.2rem">🏆</span>
            ${item.result.rank ? `<strong style="font-size:1rem;color:#fc4c02">${item.result.rank}${item.result.totalParticipants ? ` / ${item.result.totalParticipants}` : ""}</strong>` : ""}
            ${item.result.time ? `<span style="font-size:0.85rem;color:#666">· ${item.result.time}</span>` : ""}
            ${item.result.notes ? `<span style="font-size:0.82rem;color:#888">· ${item.result.notes}</span>` : ""}
          </div>
        </div>` : ""}
        ${isRace && days >= 0 ? renderRaceChecklist(item) : ""}
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          ${isRace && days < 0 ? `<button data-agenda-result="${item.id}" type="button" style="flex:1;min-width:100px;padding:8px;font-size:0.82rem;font-weight:600;border:1.5px solid #1a7a4a;border-radius:8px;background:#fff;color:#1a7a4a;cursor:pointer">${item.result ? "✏️ Résultat" : "🏆 Résultat"}</button>` : ""}
          ${isRace && days >= 0 ? `<button data-checklist-toggle="${item.id}" type="button" style="flex:1;min-width:100px;padding:8px;font-size:0.82rem;font-weight:600;border:1.5px solid #6366f1;border-radius:8px;background:#fff;color:#6366f1;cursor:pointer">☑️ Checklist</button>` : ""}
          <button data-agenda-edit="${item.id}" type="button" style="flex:1;min-width:80px;padding:8px;font-size:0.82rem;font-weight:600;border:1.5px solid #fc4c02;border-radius:8px;background:#fff;color:#fc4c02;cursor:pointer">✏️ Modifier</button>
          <button data-agenda-delete="${item.id}" type="button" style="flex:1;min-width:80px;padding:8px;font-size:0.82rem;font-weight:600;border:1.5px solid #ddd;border-radius:8px;background:#fff;color:#999;cursor:pointer">🗑 Supprimer</button>
        </div>
        <form data-result-form="${item.id}" style="display:none;flex-direction:column;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #eee">
          <p style="margin:0 0 4px;font-size:0.78rem;font-weight:700;color:#1a7a4a;text-transform:uppercase;letter-spacing:.05em">🏆 Résultat de course</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <label style="font-size:0.8rem;font-weight:600;color:#555">Classement<input name="rank" type="text" value="${item.result?.rank || ""}" placeholder="Ex: 3" style="display:block;margin-top:4px;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem;width:100%;box-sizing:border-box"/></label>
            <label style="font-size:0.8rem;font-weight:600;color:#555">/ Participants<input name="totalParticipants" type="text" value="${item.result?.totalParticipants || ""}" placeholder="Ex: 42" style="display:block;margin-top:4px;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem;width:100%;box-sizing:border-box"/></label>
          </div>
          <label style="font-size:0.8rem;font-weight:600;color:#555">Temps<input name="time" type="text" value="${item.result?.time || ""}" placeholder="Ex: 1h23m45s" style="display:block;margin-top:4px;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem"/></label>
          <label style="font-size:0.8rem;font-weight:600;color:#555">Note personnelle<input name="notes" type="text" value="${item.result?.notes || ""}" placeholder="Super course, conditions parfaites..." style="display:block;margin-top:4px;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem"/></label>
          <div style="display:flex;gap:8px">
            <button type="submit" style="flex:1;padding:9px;background:#1a7a4a;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">Enregistrer</button>
            <button type="button" data-result-cancel="${item.id}" style="flex:1;padding:9px;background:#f5f5f5;border:none;border-radius:8px;cursor:pointer">Annuler</button>
          </div>
        </form>
        <form data-agenda-edit-form="${item.id}" style="display:none;flex-direction:column;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #eee">
          <input name="name" type="text" value="${(item.name || item.title || "").replace(/"/g,"&quot;")}" placeholder="Titre" required style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem" />
          <input name="date" type="date" value="${item.date || ""}" required style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem" />
          ${!isRace ? `<select name="category" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem">${catOptions}</select>` : ""}
          <textarea name="notes" placeholder="Notes..." style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem;min-height:56px">${item.notes || ""}</textarea>
          <div style="display:flex;gap:8px">
            <button type="submit" style="flex:1;padding:9px;background:#fc4c02;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">💾 Enregistrer</button>
            <button type="button" data-agenda-cancel="${item.id}" style="flex:1;padding:9px;background:#f5f5f5;border:none;border-radius:8px;cursor:pointer">Annuler</button>
          </div>
        </form>
      </article>
    `;
  }).join("");

  // Modifier
  list.querySelectorAll("[data-agenda-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.agendaEdit;
      const form = list.querySelector(`[data-agenda-edit-form="${id}"]`);
      const open = form.style.display !== "none";
      list.querySelectorAll("[data-agenda-edit-form]").forEach(f => { f.style.display = "none"; });
      list.querySelectorAll("[data-agenda-edit]").forEach(b => { b.textContent = "✏️ Modifier"; });
      if (!open) { form.style.display = "flex"; btn.textContent = "✖ Fermer"; }
    });
  });

  // Annuler
  list.querySelectorAll("[data-agenda-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.agendaCancel;
      list.querySelector(`[data-agenda-edit-form="${id}"]`).style.display = "none";
      list.querySelector(`[data-agenda-edit="${id}"]`).textContent = "✏️ Modifier";
    });
  });

  // Enregistrer édition
  list.querySelectorAll("[data-agenda-edit-form]").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const id = form.dataset.agendaEditForm;
      const idx = state.agenda.findIndex(r => r.id === id);
      if (idx !== -1) {
        const fd = new FormData(form);
        state.agenda[idx] = {
          ...state.agenda[idx],
          name: fd.get("name").trim(),
          title: fd.get("name").trim(),
          date: fd.get("date"),
          notes: fd.get("notes").trim(),
          ...(fd.get("category") ? { category: fd.get("category") } : {})
        };
        saveState();
        showSyncBadge("✏️ Modifié");
      }
      renderAgenda();
    });
  });

  // Checklist pré-course
  list.querySelectorAll("[data-checklist-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.checklistToggle;
      const wrap = list.querySelector(`#checklist-wrap-${id}`);
      if (!wrap) return;
      const isOpen = wrap.style.display !== "none";
      wrap.style.display = isOpen ? "none" : "block";
    });
  });

  list.querySelectorAll("[data-checklist-item]").forEach(cb => {
    cb.addEventListener("change", () => {
      const id  = cb.dataset.checklistItem;
      const key = cb.dataset.checklistKey;
      const idx = state.agenda.findIndex(a => a.id === id);
      if (idx === -1) return;
      state.agenda[idx].checklist = state.agenda[idx].checklist || {};
      state.agenda[idx].checklist[key] = cb.checked;
      // Sync aussi les custom items
      if (state.agenda[idx].customChecklist) {
        const ci = state.agenda[idx].customChecklist.findIndex(c => c.id === key);
        if (ci !== -1) state.agenda[idx].customChecklist[ci].checked = cb.checked;
      }
      saveState();
      // Mettre à jour la progression sans re-render complet
      const wrap = list.querySelector(`#checklist-wrap-${id}`);
      if (wrap) {
        const allItems = RACE_CHECKLIST_DEFAULTS.length;
        const done = Object.values(state.agenda[idx].checklist).filter(Boolean).length;
        const pct = Math.round((done / allItems) * 100);
        const bar = wrap.querySelector("div[style*='background:#e8e7ff'] > div");
        if (bar) bar.style.width = pct + "%";
        const counter = wrap.querySelector("span[style*='font-weight:700']");
        if (counter) counter.textContent = `${done}/${allItems} ${done === allItems ? "✅" : ""}`;
      }
    });
  });

  list.querySelectorAll("[data-checklist-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.checklistAdd;
      const input = list.querySelector(`#checklist-custom-${id}`);
      const text = input?.value.trim();
      if (!text) return;
      const idx = state.agenda.findIndex(a => a.id === id);
      if (idx === -1) return;
      // Ajoute à une liste custom dans l'item
      state.agenda[idx].customChecklist = state.agenda[idx].customChecklist || [];
      state.agenda[idx].customChecklist.push({ id: `custom-${Date.now()}`, label: text, checked: false });
      saveState();
      renderAgenda();
    });
  });

  // Résultat de course — bouton + formulaire
  list.querySelectorAll("[data-agenda-result]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.agendaResult;
      const form = list.querySelector(`[data-result-form="${id}"]`);
      if (!form) return;
      const isOpen = form.style.display === "flex";
      form.style.display = isOpen ? "none" : "flex";
    });
  });

  list.querySelectorAll("[data-result-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.resultCancel;
      const form = list.querySelector(`[data-result-form="${id}"]`);
      if (form) form.style.display = "none";
    });
  });

  list.querySelectorAll("[data-result-form]").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const id = form.dataset.resultForm;
      const idx = state.agenda.findIndex(a => a.id === id);
      if (idx === -1) return;
      const data = new FormData(form);
      state.agenda[idx].result = {
        rank:             data.get("rank").trim(),
        totalParticipants: data.get("totalParticipants").trim(),
        time:             data.get("time").trim(),
        notes:            data.get("notes").trim()
      };
      saveState();
      renderAgenda();
    });
  });

  // Supprimer
  list.querySelectorAll("[data-agenda-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.confirming === "1") {
        const id = btn.dataset.agendaDelete;
        state.agenda = state.agenda.filter(r => r.id !== id);
        saveState();
        renderAgenda();
      } else {
        btn.dataset.confirming = "1";
        btn.textContent = "⚠️ Confirmer ?";
        btn.style.borderColor = "#fc4c02";
        btn.style.color = "#fc4c02";
        setTimeout(() => {
          if (btn.dataset.confirming === "1") {
            btn.dataset.confirming = "0";
            btn.textContent = "🗑 Supprimer";
            btn.style.borderColor = "#ddd";
            btn.style.color = "#999";
          }
        }, 4000);
      }
    });
  });
}

function renderOpenRuns() {
  const list = document.querySelector('[data-list="openRuns"]');
  if (!list) return;

  const filterType     = document.querySelector("#open-run-filter-type")?.value || "";
  const filterLevel    = document.querySelector("#open-run-filter-level")?.value || "";
  const filterDistance = document.querySelector("#open-run-filter-distance")?.value || "";
  const filterRegion   = document.querySelector("#open-run-filter-region")?.value.trim().toLowerCase() || "";

  const openRuns = mergeOpenRuns([...remoteOpenRuns, ...state.openRuns])
    .filter((run) => {
      const typeOk     = !filterType  || run.type  === filterType;
      const levelOk    = !filterLevel || run.level === filterLevel;
      const regionOk   = !filterRegion || `${run.location || ""} ${run.region || ""}`.toLowerCase().includes(filterRegion);
      const dist = Number(run.distance || 0);
      const distOk = !filterDistance ||
        (filterDistance === "short"  && dist < 10) ||
        (filterDistance === "medium" && dist >= 10 && dist <= 30) ||
        (filterDistance === "long"   && dist > 30);
      return typeOk && levelOk && regionOk && distOk;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const statusCard = `
    <article class="open-run-status ${openRunLoading ? "loading" : ""}">
      <span>${openRunCommunityStatus}</span>
      <b>${openRuns.length} sortie(s) ouverte(s)</b>
    </article>
  `;

  list.innerHTML = statusCard + (openRuns.map((run) => {
    const days = daysUntil(run.date);
    const status = days < 0 ? "Archive" : days === 0 ? "Aujourd'hui" : `J-${days}`;
    const joined = Boolean(state.openRunJoins[run.id]);
    const participants = getOpenRunParticipants(run);
    return `
      <article class="open-run-card ${joined ? "joined" : ""}">
        <div>
          <span>${status} - ${run.type} - ${run.level}</span>
          <h2>${run.title}</h2>
          <p>${formatFullDate(run.date)} - ${run.location || "Lieu a definir"}</p>
        </div>
        <strong>${Number(run.distance || 0)} km</strong>
        <div class="agenda-meta">
          <span>${participants.length} participant(s)</span>
          <span>${run.owner || "MushTrack"}</span>
        </div>
        <p>${run.notes || "Sortie ouverte pour avancer avec son chien."}</p>
        <div class="open-run-participants">
          ${participants.map((person) => `<span>${person}</span>`).join("") || `<span>Aucun participant</span>`}
        </div>
        <button class="${joined ? "secondary-button" : "primary-button"}" data-join-open-run="${run.id}" type="button">${joined ? "Je ne participe plus" : "Je participe"}</button>
      </article>
    `;
  }).join("") || `<p class="empty-state">Aucune sortie ouverte. Cree une sortie pour trouver des personnes motivees pres de chez toi.</p>`);

  list.querySelectorAll("[data-join-open-run]").forEach((button) => {
    button.addEventListener("click", () => toggleOpenRunJoin(button.dataset.joinOpenRun));
  });
}

function getOpenRunParticipants(run) {
  const owner = run.owner || "Musher";
  const joined = Boolean(state.openRunJoins[run.id]);
  const remoteParticipants = Array.isArray(run.participants)
    ? run.participants.map((person) => person.region ? `${person.name} (${person.region})` : person.name)
    : [];
  const participants = [owner, ...remoteParticipants];
  if (joined && owner !== (state.profile.name || "Musher")) participants.push(state.profile.name || "Moi");
  return [...new Set(participants)].slice(0, 6);
}

async function toggleOpenRunJoin(id) {
  const joined = Boolean(state.openRunJoins[id]);
  if (joined) {
    delete state.openRunJoins[id];
  } else {
    state.openRunJoins[id] = {
      id,
      date: new Date().toISOString(),
      profileName: state.profile.name || "Musher",
      region: state.profile.region || "",
      status: "participant"
    };
  }
  saveState();
  renderOpenRuns();

  try {
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "open-run-join",
        openRunId: id,
        deviceId: state.deviceId,
        joined: !joined,
        profile: state.profile
      })
    });
    const data = await response.json();
    openRunCommunityStatus = data.configured ? "Sorties synchronisees" : "Sorties locales, base non configuree";
  } catch {
    openRunCommunityStatus = "Sorties locales, API non joignable";
  } finally {
    fetchOpenRuns();
    renderOpenRuns();
  }
}

function mergeOpenRuns(items) {
  const map = new Map();
  items.forEach((run) => {
    if (!run?.id) return;
    if (!map.has(run.id)) {
      map.set(run.id, run);
      return;
    }
    map.set(run.id, { ...map.get(run.id), ...run });
  });
  return [...map.values()];
}

async function fetchOpenRuns() {
  if (openRunLoading) return;
  openRunLoading = true;
  openRunCommunityStatus = "Recherche des sorties ouvertes";
  renderOpenRuns();

  try {
    const region = state.profile.region || "";
    const response = await fetch(`/api/community?kind=open-runs&region=${encodeURIComponent(region)}`);
    const data = await response.json();
    if (data.configured && Array.isArray(data.openRuns)) {
      remoteOpenRuns = data.openRuns;
      openRunCommunityStatus = "Sorties communautaires actives";
    } else {
      openRunCommunityStatus = "Sorties locales, base non configuree";
    }
  } catch {
    openRunCommunityStatus = "Sorties locales, API non joignable";
  } finally {
    openRunLoading = false;
    renderOpenRuns();
  }
}

function renderNextRace() {
  const list = document.querySelector('[data-list="nextRace"]');
  if (!list) return;
  const next = getNextAgendaRace();
  if (!next) {
    list.innerHTML = `<article><span>Agenda</span><strong>Aucune course</strong><p>Ajoute une course pour construire ta saison.</p></article>`;
    return;
  }
  const days = daysUntil(next.date);
  list.innerHTML = `
    <article>
      <span>Prochaine course</span>
      <strong>${next.name}</strong>
      <p>${next.type} - ${next.distance} km - ${days <= 0 ? "maintenant" : `dans ${days} jours`}</p>
    </article>
    <button class="primary-button" data-go="agenda">Agenda</button>
  `;
  list.querySelector("[data-go]").addEventListener("click", () => showScreen("agenda"));
}

function getNextAgendaRace() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [...state.agenda]
    .filter((race) => new Date(`${race.date}T12:00:00`) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
}

function getAgendaReadiness(race) {
  const days = daysUntil(race.date);
  const weekKm = getWeekKm();
  if (days < 0) return "Archive";
  if (days < 10) return weekKm > 45 ? "Affutage" : "Derniers reglages";
  if (race.priority === "A") return "Objectif saison";
  return "Preparation";
}

function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T12:00:00`);
  return Math.ceil((date - today) / 86400000);
}

function formatFullDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" });
}

function getPlanIntro() {
  const context = getPlanContext();
  if (context.weatherRisk) return `Plan mis a jour automatiquement avec la meteo: ${context.weatherRisk}. Volume et intensite ajustes.`;
  if (context.daysToRace <= 10) return "Plan mis a jour automatiquement: course proche, priorité a l'affutage et a une team fraiche.";
  if (context.loadRatio > 1.25) return "Plan mis a jour automatiquement: charge recente haute, semaine allegee conseillee.";
  if (state.seasonMode === "summer") return "Mode ete: travail en canicross, temperatures basses, hydratation et coussinets surveilles.";
  if (state.raceType === "Sprint") return "Le plan privilegie vitesse, departs propres et recuperation rapide.";
  if (state.raceType === "Longue distance") return "Le plan construit volume, regularite, alimentation et sorties enchainees.";
  return "Le plan augmente doucement le volume, avec une semaine legere toutes les 4 semaines.";
}

function updatePlanWeatherIfNeeded() {
  const lastUpdate = state.planWeatherUpdatedAt ? new Date(state.planWeatherUpdatedAt).getTime() : 0;
  const isFresh = Date.now() - lastUpdate < 45 * 60 * 1000;
  if (isFresh || planWeatherLoading) return;
  if (!navigator.geolocation) return;

  planWeatherLoading = true;
  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const { latitude, longitude } = position.coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}`
        + `&current=temperature_2m,wind_speed_10m,precipitation,weather_code`
        + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code`
        + `&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
      const response = await fetch(url);
      const data = await response.json();
      state.planWeather = {
        temperature: Number(data.current.temperature_2m || 0),
        wind: Number(data.current.wind_speed_10m || 0),
        precipitation: Number(data.current.precipitation || 0)
      };
      // Stocker les prévisions 7 jours indexées par date YYYY-MM-DD
      const fc = {};
      const dates = data.daily?.time || [];
      dates.forEach((d, i) => {
        fc[d] = {
          tempMax:   data.daily.temperature_2m_max[i],
          tempMin:   data.daily.temperature_2m_min[i],
          precip:    data.daily.precipitation_sum[i],
          wind:      data.daily.wind_speed_10m_max[i],
          code:      data.daily.weather_code[i]
        };
      });
      state.forecast = fc;
      state.planWeatherUpdatedAt = new Date().toISOString();
      saveState();
      render();
    } catch {
      renderPlanInsights();
    } finally {
      planWeatherLoading = false;
    }
  }, () => {
    planWeatherLoading = false;
    renderPlanInsights();
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 });
}

function fillSettingsForm() {
  document.querySelector("#profile-name").value = state.profile.name || "";
  document.querySelector("#profile-region").value = state.profile.region || "";
  document.querySelector("#profile-level").value = state.profile.level || "Loisir";
  document.querySelector("#profile-disciplines").value = state.profile.disciplines || "";
  document.querySelector("#goal-km").value = state.goalKm;
  document.querySelector("#goal-date").value = state.goalDate;
  document.querySelector("#race-name").value = state.raceName || "";
  document.querySelector("#race-date").value = state.raceDate || "";
  document.querySelector("#race-type").value = state.raceType;
  document.querySelector("#race-km").value = state.raceKm;
}

function toggleDogSelection(id) {
  const isSelected = state.selectedDogIds.includes(id);
  if (isSelected) {
    state.selectedDogIds = state.selectedDogIds.filter((dogId) => dogId !== id);
    // Retirer le chien du schéma attelage
    if (state.teamPositions) {
      const entry = Object.entries(state.teamPositions).find(([, v]) => v === id);
      if (entry) delete state.teamPositions[entry[0]];
    }
  } else {
    state.selectedDogIds = [...state.selectedDogIds, id];
    // Assigner au prochain emplacement libre selon le schéma actuel
    if (!state.teamPositions) state.teamPositions = {};
    const allSlots = getSledPositions(state.selectedDogIds.length).flatMap(([k]) => [`${k}-l`, `${k}-r`]);
    const freeSlot = allSlots.find(s => !state.teamPositions[s]);
    if (freeSlot) state.teamPositions[freeSlot] = id;
  }
  saveState();
  render();
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-CH", { day: "2-digit", month: "short" });
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
  }
function initMap(lat = 46.8182, lon = 8.2275) {
  const mapElement = document.querySelector("#map");

  if (!mapElement || typeof L === "undefined") {
    return;
  }

  if (map) {
    map.invalidateSize();
    return;
  }

  map = L.map("map").setView([lat, lon], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap"
  }).addTo(map);

  marker = L.marker([lat, lon]).addTo(map);

  polyline = L.polyline([], {
    color: "#fc4c02",
    weight: 4
  }).addTo(map);
}

function updateMapPosition(lat, lon, label = "Position GPS active") {
  if (!map) {
    initMap(lat, lon);
  }

  if (marker) {
    marker.setLatLng([lat, lon]);
  }

  if (map) {
    map.setView([lat, lon], Math.max(map.getZoom(), 15));
  }

  if (gpsStatusEl) {
    gpsStatusEl.textContent = label;
  }
}

function startLiveLocation() {
  if (timer || liveWatchId !== null) return;

  if (!navigator.geolocation) {
    if (gpsStatusEl) gpsStatusEl.textContent = "GPS non disponible sur cet appareil.";
    return;
  }

  if (gpsStatusEl) gpsStatusEl.textContent = "Recherche de ta position...";

  liveWatchId = navigator.geolocation.watchPosition(
    (position) => {
      updateMapPosition(
        position.coords.latitude,
        position.coords.longitude,
        `Position active - precision ${Math.round(position.coords.accuracy || 0)} m`
      );
    },
    () => {
      if (gpsStatusEl) gpsStatusEl.textContent = "Position refusee ou signal GPS indisponible.";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 12000
    }
  );
}

function stopLiveLocation() {
  if (liveWatchId !== null) {
    navigator.geolocation.clearWatch(liveWatchId);
    liveWatchId = null;
  }
}

// Détecte si on tourne dans Capacitor (Android natif)
function isCapacitorNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function onGPSPosition(lat, lon, accuracy, gpsSpeedMs) {
  if (accuracy > 50) {
    updateMapPosition(lat, lon, `GPS: recherche précision (±${Math.round(accuracy)}m)…`);
    return;
  }
  if (lastPosition) {
    const jump = calculateDistance(lastPosition.lat, lastPosition.lon, lat, lon);
    if (jump > 0.3) return;
  }
  if (lastPosition) {
    const moved = calculateDistance(lastPosition.lat, lastPosition.lon, lat, lon);
    if (moved < 0.005) return;
  }

  updateMapPosition(lat, lon, `GPS actif — ±${Math.round(accuracy)}m`);
  const point = { lat, lon, timestamp: Date.now() };
  gpsPath.push(point);
  if (polyline) polyline.addLatLng([lat, lon]);
  if (lastPosition) {
    const segment = calculateDistance(lastPosition.lat, lastPosition.lon, lat, lon);
    if (segment < 1) distance += segment;
  }
  lastPosition = point;

  const hours = seconds / 3600;
  const calcSpeed = hours > 0 ? distance / hours : 0;
  const displaySpeed = gpsSpeedMs && gpsSpeedMs > 0 ? gpsSpeedMs * 3.6 : calcSpeed;
  distanceEl.textContent = distance.toFixed(2);
  speedEl.textContent = displaySpeed.toFixed(1);
}

async function startGPS() {
  stopLiveLocation();
  gpsPath = [];
  lastPosition = null;
  if (polyline) polyline.setLatLngs([]);

  let weatherFetched = false;

  if (isCapacitorNative()) {
    // ── Mode Android natif : background geolocation ──────────────────────
    try {
      const BackgroundGeolocation = window.Capacitor?.Plugins?.BackgroundGeolocation;
      if (!BackgroundGeolocation) throw new Error("Plugin non disponible");

      watchId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "MushTrack enregistre votre parcours.",
          backgroundTitle: "MushTrack GPS",
          requestPermissions: true,
          stale: false,
          distanceFilter: 5
        },
        (position, error) => {
          if (error) { console.error("BG GPS error:", error); return; }
          const { latitude: lat, longitude: lon, accuracy, speed: gpsSpeedMs } = position;
          if (!weatherFetched) { weatherFetched = true; fetchAndShowWeather(lat, lon); }
          onGPSPosition(lat, lon, accuracy, gpsSpeedMs);
        }
      );

    } catch (e) {
      console.error("BackgroundGeolocation plugin error:", e);
      _startGPSBrowser(weatherFetched);
    }
  } else {
    // ── Mode PWA navigateur : geolocation classique ───────────────────────
    _startGPSBrowser(weatherFetched);
  }
}

function _startGPSBrowser(weatherFetched) {
  if (!navigator.geolocation) { alert("GPS non disponible"); return; }
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude: lat, longitude: lon, accuracy, speed: gpsSpeedMs } = position.coords;
      if (!weatherFetched) { weatherFetched = true; fetchAndShowWeather(lat, lon); }
      onGPSPosition(lat, lon, accuracy, gpsSpeedMs);
    },
    (error) => { console.error("GPS error:", error); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
  );
}

async function stopGPS() {
  if (watchId === null) return;
  if (isCapacitorNative()) {
    try {
      const BackgroundGeolocation = window.Capacitor?.Plugins?.BackgroundGeolocation;
      if (BackgroundGeolocation) await BackgroundGeolocation.removeWatcher({ id: watchId });
    } catch (e) { console.error("stopGPS native error:", e); }
  } else {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
}
function setRecordButtonState(running) {
  const playIcon = document.querySelector("#record-icon-play");
  const pauseIcon = document.querySelector("#record-icon-pause");
  const finishBtn = document.querySelector("#finish-run");
  if (running) {
    recordButton.classList.add("running");
    if (playIcon) playIcon.style.display = "none";
    if (pauseIcon) pauseIcon.style.display = "";
    if (finishBtn) finishBtn.classList.remove("hidden");
  } else {
    recordButton.classList.remove("running");
    if (playIcon) playIcon.style.display = "";
    if (pauseIcon) pauseIcon.style.display = "none";
  }
}

function toggleRecording() {
  postRunForm.classList.add("hidden");

  if (timer) {
    clearInterval(timer);
    timer = null;

    stopGPS().then(() => startLiveLocation());


    setRecordButtonState(false);
    return;
  }

  timer = setInterval(() => {
    seconds += 1;
    durationEl.textContent = formatDuration(seconds);
    // Allure (pace) en min/km
    const paceEl = document.querySelector("#pace");
    if (paceEl && distance > 0) {
      const minPerKm = seconds / 60 / distance;
      const pMin = Math.floor(minPerKm);
      const pSec = Math.round((minPerKm - pMin) * 60);
      paceEl.textContent = `${pMin}:${String(pSec).padStart(2, "0")}`;
    }
  }, 1000);

  startGPS();
  setRecordButtonState(true);
}

function finishCurrentRun() {
  if (distance < 0.05) {
    distance = 12.6;
    seconds = 3180;
  }

  if (timer) toggleRecording();

  const hours = seconds / 3600;
  const speed = hours > 0 ? distance / hours : 0;
  pendingRunSummary = {
    km: Number(distance.toFixed(1)),
    speed: Number(speed.toFixed(1)),
    duration: seconds
  };

  document.querySelector("#runType").value = detectRunType(pendingRunSummary.km, pendingRunSummary.speed);
  document.querySelector("#weather").value = "Meteo en cours...";
  postRunForm.classList.remove("hidden");
  fetchWeatherForRun();
}

function detectRunType(km, speed) {
  const disciplines = (state.profile.disciplines || "").toLowerCase();
  const isSummer    = state.seasonMode === "summer";
  const isCanicross = disciplines.includes("canicross");
  const isSkijor    = disciplines.includes("ski") || disciplines.includes("joering");
  const isBike      = disciplines.includes("bike") || disciplines.includes("vtt") || disciplines.includes("trottinette");
  const isSled      = disciplines.includes("traineau") || disciplines.includes("kart") || disciplines.includes("dryland");

  // Vitesse très élevée → traîneau / kart / ski-joering
  if (speed >= 28) {
    if (isSkijor)  return "Ski-joering";
    if (isBike)    return "Cani-VTT";
    if (isSled)    return "Traineau / Kart";
    return isSummer ? "Dryland sprint" : "Sprint traineau";
  }
  if (speed >= 20) {
    if (isSled && !isSummer)   return "Endurance traineau";
    if (isSkijor)              return "Ski-joering endurance";
    if (isBike)                return "Cani-VTT endurance";
    return "Sprint";
  }
  // Vitesse canicross / trot (12-20 km/h)
  if (speed >= 14) {
    if (isCanicross)  return km >= 15 ? "Canicross longue" : "Canicross";
    if (km >= 20)     return "Sortie longue";
    if (km >= 12)     return "Endurance";
    return "Canicross";
  }
  // Allure modérée
  if (speed >= 10) {
    if (km <= 6)  return "Recuperation";
    if (km >= 25) return "Sortie longue";
    return "Endurance";
  }
  // Lente / très court
  if (km <= 5) return "Recuperation";
  if (km >= 20) return "Sortie longue";
  return "Cotes / technique";
}

function fetchWeatherForRun() {
  const weatherInput = document.querySelector("#weather");
  if (!navigator.geolocation) {
    weatherInput.value = state.seasonMode === "summer" ? "Meteo auto indisponible, mode ete" : "Meteo auto indisponible, mode hiver";
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const { latitude, longitude } = position.coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,wind_speed_10m,precipitation`;
      const response = await fetch(url);
      const data = await response.json();
      const current = data.current;
      weatherInput.value = `${Math.round(current.temperature_2m)} C, vent ${Math.round(current.wind_speed_10m)} km/h, pluie ${current.precipitation} mm`;
    } catch {
      weatherInput.value = state.seasonMode === "summer" ? "Meteo auto indisponible, mode ete" : "Meteo auto indisponible, mode hiver";
    }
  }, () => {
    weatherInput.value = state.seasonMode === "summer" ? "Position refusee, mode ete" : "Position refusee, mode hiver";
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 });
}

function saveCurrentRun() {
  if (!pendingRunSummary) finishCurrentRun();

  const temp = typeof state.planWeather === "object" && state.planWeather
    ? state.planWeather.temperature ?? null
    : null;
  const run = {
    date: new Date().toISOString().slice(0, 10),
    type: document.querySelector("#runType").value,
    km: pendingRunSummary.km,
    speed: pendingRunSummary.speed,
    path: gpsPath,
    team: [...state.selectedDogIds],
    weather: document.querySelector("#weather").value,
    temp,
    energy: Number(document.querySelector("#energy").value),
    recovery: document.querySelector("#recovery").value,
    paws: document.querySelector("#paw-check").checked,
    hydrated: document.querySelector("#hydrated").checked,
    notes: document.querySelector("#notes").value
  };

  state.runs.unshift(run);
  state.dogs = state.dogs.map((dog) => (
    state.selectedDogIds.includes(dog.id) ? { ...dog, km: dog.km + run.km } : dog
  ));

  seconds = 0;
  distance = 0;
  distanceEl.textContent = "0.00";
  durationEl.textContent = "00:00";
  speedEl.textContent = "0.0";
  recordButton.textContent = "Demarrer";
  recordButton.classList.remove("running");
  pendingRunSummary = null;
  postRunForm.classList.add("hidden");

  saveState();
  showScreen("record");
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

// Bouton "Modifier" attelage dans l'écran GPS
document.querySelector("#toggle-dog-picker-record")?.addEventListener("click", () => {
  const picker = document.querySelector("#dog-picker-record");
  const diagram = document.querySelector("#gps-sled-diagram");
  if (!picker) return;
  const opening = picker.classList.contains("hidden");
  picker.classList.toggle("hidden", !opening);
  if (diagram) diagram.classList.toggle("hidden", opening);
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.seasonMode = button.dataset.mode;
    saveState();
    render();
  });
});

document.querySelector('[data-action="toggleDogForm"]').addEventListener("click", () => {
  if (!dogForm.classList.contains("hidden")) {
    resetDogForm();
    return;
  }

  editingDogId = null;
  dogSubmitButton.textContent = "Ajouter";
  dogForm.classList.remove("hidden");
  // Reset photo preview
  const preview = document.getElementById("dog-photo-preview");
  if (preview) { preview.innerHTML = "🐕"; preview.style.background = "#f0f0f0"; }
  currentDogPhotoDataUrl = null;
});

// ── Photo de profil chien ─────────────────────────────────────────────────────
let currentDogPhotoDataUrl = null;

document.getElementById("dog-photo-input")?.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const SIZE = 300;
      const ratio = Math.min(SIZE / img.width, SIZE / img.height);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      currentDogPhotoDataUrl = canvas.toDataURL("image/jpeg", 0.75);
      const preview = document.getElementById("dog-photo-preview");
      if (preview) {
        preview.innerHTML = "";
        const im = document.createElement("img");
        im.src = currentDogPhotoDataUrl;
        im.style.cssText = "width:100%;height:100%;object-fit:cover";
        preview.appendChild(im);
        preview.style.border = "2px solid #fc4c02";
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

document.querySelector('[data-action="toggleEventForm"]')?.addEventListener("click", () => {
  const f = document.querySelector("#event-form");
  if (f) f.classList.toggle("hidden");
});

document.querySelector('[data-action="toggleRaceForm"]')?.addEventListener("click", () => {
  const f = document.querySelector("#event-form");
  if (f) f.classList.toggle("hidden");
});

document.querySelector('[data-action="toggleOpenRunForm"]')?.addEventListener("click", () => {
  openRunForm?.classList.toggle("hidden");
});

// Soumission formulaire événement personnel
document.querySelector("#event-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.querySelector("#event-title").value.trim();
  const date  = document.querySelector("#event-date").value;
  if (!title || !date) return;
  state.agenda.push({
    id: `evt-${Date.now()}`,
    kind: "event",
    name: title,
    title,
    date,
    category: document.querySelector("#event-category").value,
    notes: document.querySelector("#event-notes").value.trim()
  });
  e.target.reset();
  e.target.classList.add("hidden");
  saveState();
  renderAgenda();
  showSyncBadge("✅ Événement ajouté");
});

dogForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#dog-name").value.trim();
  if (!name) return;

  if (editingDogId) {
    const dog = state.dogs.find((item) => item.id === editingDogId);
    if (!dog) return;

    dog.name = name;
    dog.role = document.querySelector("#dog-role").value;
    dog.birthdate = document.querySelector("#dog-birthdate").value || dog.birthdate || getApproxBirthdate(3);
    dog.age = getDogAge(dog);
    const newWeight = Number(document.querySelector("#dog-weight").value || dog.weight || 22);
    if (newWeight !== dog.weight) {
      // Enregistre dans l'historique si le poids a changé
      dog.weightHistory = dog.weightHistory || [];
      dog.weightHistory.push({ date: new Date().toISOString().slice(0, 10), weight: newWeight });
      if (dog.weightHistory.length > 52) dog.weightHistory = dog.weightHistory.slice(-52); // max 52 entrées
      dog.weight = newWeight;
    }
    dog.harness = document.querySelector("#dog-harness").value.trim();
    dog.vet = document.querySelector("#dog-vet").value.trim();
    dog.limitation = document.querySelector("#dog-limitation").value.trim();
    dog.note = document.querySelector("#dog-note").value.trim();
    if (currentDogPhotoDataUrl) dog.photoDataUrl = currentDogPhotoDataUrl;
    resetDogForm();
    saveState();
    render();
    return;
  }

  const dog = {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    name,
    role: document.querySelector("#dog-role").value,
    note: document.querySelector("#dog-note").value.trim(),
    birthdate: document.querySelector("#dog-birthdate").value || getApproxBirthdate(3),
    age: getDogAge({ birthdate: document.querySelector("#dog-birthdate").value || getApproxBirthdate(3) }),
    weight: Number(document.querySelector("#dog-weight").value || 22),
    weightHistory: [{ date: new Date().toISOString().slice(0, 10), weight: Number(document.querySelector("#dog-weight").value || 22) }],
    harness: document.querySelector("#dog-harness").value.trim(),
    vet: document.querySelector("#dog-vet").value.trim(),
    limitation: document.querySelector("#dog-limitation").value.trim(),
    status: "Nouveau",
    km: 0,
    photoDataUrl: currentDogPhotoDataUrl || null
  };

  state.dogs.push(dog);
  state.selectedDogIds.push(dog.id);
  resetDogForm();
  saveState();
  render();
});

raceForm?.addEventListener("submit", (event) => { event.preventDefault(); });

openRunForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.querySelector("#open-run-title").value.trim();
  const date = document.querySelector("#open-run-date").value;
  if (!title || !date) return;

  const openRun = {
    id: `open-run-${Date.now()}`,
    title,
    date,
    type: document.querySelector("#open-run-type").value,
    level: document.querySelector("#open-run-level").value,
    distance: Number(document.querySelector("#open-run-distance").value || 0),
    location: document.querySelector("#open-run-location").value.trim(),
    notes: document.querySelector("#open-run-notes").value.trim(),
    owner: state.profile.name || "Musher",
    ownerRegion: state.profile.region || "",
    createdAt: new Date().toISOString()
  };

  state.openRuns.unshift(openRun);

  openRunForm.reset();
  openRunForm.classList.add("hidden");
  saveState();
  renderOpenRuns();

  try {
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "open-run",
        ...openRun,
        deviceId: state.deviceId,
        region: state.profile.region || openRun.location,
        profile: state.profile
      })
    });
    const data = await response.json();
    openRunCommunityStatus = data.configured ? "Sortie publiee en ligne" : "Sortie gardee en local, base non configuree";
  } catch {
    openRunCommunityStatus = "Sortie gardee en local, API non joignable";
  } finally {
    fetchOpenRuns();
    renderOpenRuns();
  }
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.profile = {
    name: document.querySelector("#profile-name").value.trim() || "Musher",
    region: document.querySelector("#profile-region").value.trim(),
    level: document.querySelector("#profile-level").value,
    disciplines: document.querySelector("#profile-disciplines").value.trim()
  };
  state.goalKm = Number(document.querySelector("#goal-km").value);
  state.goalDate = document.querySelector("#goal-date").value;
  state.raceName = document.querySelector("#race-name").value.trim();
  state.raceDate = document.querySelector("#race-date").value;
  state.raceType = document.querySelector("#race-type").value;
  state.raceKm = Number(document.querySelector("#race-km").value);
  saveState();
  renderPlan(); // recalcule le plan si la date de course a changé
  showScreen("dashboard");
});

recordButton.addEventListener("click", toggleRecording);
finishRunButton.addEventListener("click", finishCurrentRun);
saveRunButton.addEventListener("click", saveCurrentRun);

// ── Coach IA ─────────────────────────────────────────────────────────
const coachModal = document.querySelector("#coach-modal");
const coachResult = document.querySelector("#coach-result");
const coachQuestion = document.querySelector("#coach-question");

document.querySelector("#open-coach-btn")?.addEventListener("click", () => {
  coachModal.classList.remove("hidden");
  // Réinitialise si pas encore de résultat
  if (!coachResult.dataset.hasResult) {
    coachResult.innerHTML = buildCoachWelcome();
  }
});

document.querySelector("#coach-modal-close")?.addEventListener("click", () => {
  coachModal.classList.add("hidden");
});

// Fermer en cliquant hors de la modal
coachModal?.addEventListener("click", (e) => {
  if (e.target === coachModal) coachModal.classList.add("hidden");
});

document.querySelector("#coach-analyze-btn")?.addEventListener("click", requestCoachAnalysis);

function buildCoachWelcome() {
  const raceName = state.raceDate ? "course objectif" : "course objectif";
  const settingsRaceName = state.raceName || state.raceType || "Mid-distance";
  const raceKm = state.raceKm || 100;
  const runCount = state.runs.length;
  const dogCount = state.dogs.length;
  const totalKm = state.runs.reduce((s, r) => s + Number(r.km || 0), 0).toFixed(0);

  return `
    <div class="coach-welcome">
      <div class="coach-welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fc4c02" stroke-width="1.8" width="40" height="40"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg>
      </div>
      <h3>Prêt à analyser ton entraînement</h3>
      <p>Je vais analyser tes <strong>${runCount} sortie(s)</strong>, tes <strong>${dogCount} chien(s)</strong> et tes <strong>${totalKm} km</strong> enregistrés pour te donner un rapport détaillé vers ton objectif <strong>${settingsRaceName} ${raceKm} km</strong>.</p>
      <ul class="coach-welcome-list">
        <li>📊 Évaluation de ta condition actuelle</li>
        <li>🗓️ Plan d'entraînement 4 semaines personnalisé</li>
        <li>🐕 Conseils spécifiques pour tes chiens</li>
        <li>⚡ Actions prioritaires cette semaine</li>
        <li>⚠️ Alertes si quelque chose doit être corrigé</li>
      </ul>
      <p class="coach-welcome-hint">Analyse 100&nbsp;% locale · gratuite · instantanée.</p>
    </div>
  `;
}

// ── Coach local — 100 % gratuit, zéro appel API ──────────────────────────────
function requestCoachAnalysis() {
  const btn = document.querySelector("#coach-analyze-btn");
  btn.disabled = true;

  // Légère pause visuelle pour que l'analyse paraisse sérieuse
  setTimeout(() => {
    const report = buildLocalCoachReport();
    coachResult.innerHTML = `
      <div class="coach-analysis">
        <div class="coach-analysis-meta">
          <span>Analyse du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span>Coach MushTrack local · gratuit</span>
        </div>
        <div class="coach-analysis-text">${report}</div>
        <button class="secondary-button coach-refresh-btn" id="coach-refresh-btn" type="button">🔄 Actualiser l'analyse</button>
      </div>
    `;
    coachResult.dataset.hasResult = "1";
    document.querySelector("#coach-refresh-btn")?.addEventListener("click", () => {
      delete coachResult.dataset.hasResult;
      coachResult.innerHTML = buildCoachWelcome();
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:-2px;margin-right:6px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Analyser`;
    });
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:-2px;margin-right:6px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Analyser`;
  }, 900);
}

// ── Moteur d'analyse locale ───────────────────────────────────────────────────
function buildLocalCoachReport() {
  const runs      = state.runs || [];
  const dogs      = state.dogs || [];
  const raceKm    = Number(state.raceKm)  || 100;
  const raceName  = state.raceName || state.raceType || "Course objectif";
  const raceDate  = state.raceDate || "";
  const daysLeft  = raceDate ? daysUntil(raceDate) : null;
  const level     = state.profile?.level || "Amateur";

  // ── Statistiques de base ──
  const totalKm     = runs.reduce((s, r) => s + Number(r.km || 0), 0);
  const runCount    = runs.length;
  const avgSpeed    = runCount > 0
    ? runs.reduce((s, r) => s + Number(r.avgSpeed || 0), 0) / runCount
    : 0;
  const avgEnergy   = runs.filter((r) => r.energy).length > 0
    ? runs.filter((r) => r.energy).reduce((s, r) => s + Number(r.energy), 0) / runs.filter((r) => r.energy).length
    : null;

  // Dernières 4 semaines
  const now4w = new Date(); now4w.setDate(now4w.getDate() - 28);
  const runs4w = runs.filter((r) => r.date && new Date(r.date) >= now4w);
  const km4w   = runs4w.reduce((s, r) => s + Number(r.km || 0), 0);

  // Dernière semaine
  const now1w = new Date(); now1w.setDate(now1w.getDate() - 7);
  const runs1w = runs.filter((r) => r.date && new Date(r.date) >= now1w);
  const km1w   = runs1w.reduce((s, r) => s + Number(r.km || 0), 0);

  // Volume hebdo recommandé selon objectif
  const weeklyTarget = daysLeft !== null
    ? (daysLeft > 60 ? raceKm * 0.25 : daysLeft > 28 ? raceKm * 0.35 : daysLeft > 10 ? raceKm * 0.20 : raceKm * 0.10)
    : raceKm * 0.25;
  const weeklyRatio  = weeklyTarget > 0 ? km1w / weeklyTarget : 0;

  // ── Section 1 : Évaluation actuelle ──
  let evalNote, evalColor;
  if (runCount === 0) {
    evalNote = "Aucune sortie enregistrée. Il est impossible d'évaluer la condition. Commence à enregistrer tes sorties pour obtenir une analyse.";
    evalColor = "⚪";
  } else if (weeklyRatio >= 0.85 && weeklyRatio <= 1.25) {
    evalNote = `Tu es dans la bonne zone de volume (${km1w.toFixed(0)} km cette semaine, cible ${weeklyTarget.toFixed(0)} km). Continue sur cette lancée.`;
    evalColor = "🟢";
  } else if (weeklyRatio < 0.85) {
    evalNote = `Volume insuffisant cette semaine : ${km1w.toFixed(0)} km pour un objectif de ${weeklyTarget.toFixed(0)} km. Tu es à ${Math.round(weeklyRatio * 100)}% de la cible.`;
    evalColor = "🟡";
  } else {
    evalNote = `Volume élevé cette semaine : ${km1w.toFixed(0)} km — soit ${Math.round(weeklyRatio * 100)}% de la cible. Surveille la récupération des chiens.`;
    evalColor = "🟠";
  }

  // ── Section 2 : Tendances ──
  const trends = [];
  if (runCount >= 3) {
    const recent3  = [...runs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const avgRec   = recent3.reduce((s, r) => s + Number(r.km || 0), 0) / 3;
    const older3   = [...runs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(3, 6);
    if (older3.length > 0) {
      const avgOld = older3.reduce((s, r) => s + Number(r.km || 0), 0) / older3.length;
      if (avgRec > avgOld * 1.15) trends.push("📈 Le volume par sortie progresse — bonne dynamique.");
      else if (avgRec < avgOld * 0.85) trends.push("📉 Le volume par sortie diminue — vérifie la fatigue ou la météo.");
    }
  }
  if (avgSpeed > 0) {
    if (avgSpeed < 12) trends.push("🐢 Vitesse moyenne basse (" + avgSpeed.toFixed(1) + " km/h) — normal en endurance, mais veille à intégrer des sorties plus dynamiques.");
    else if (avgSpeed >= 16) trends.push("⚡ Bonne vitesse moyenne (" + avgSpeed.toFixed(1) + " km/h) — pense à équilibrer avec des sorties longues et lentes.");
    else trends.push("✅ Vitesse moyenne correcte : " + avgSpeed.toFixed(1) + " km/h.");
  }
  if (avgEnergy !== null) {
    if (avgEnergy < 3) trends.push("😴 Énergie moyenne faible (" + avgEnergy.toFixed(1) + "/5) — les chiens donnent des signes de fatigue. Augmente les jours de repos.");
    else if (avgEnergy >= 4) trends.push("💪 Énergie des chiens au beau fixe (" + avgEnergy.toFixed(1) + "/5) — attelage en forme.");
  }
  if (runs4w.length < 3) trends.push("📅 Moins de 3 sorties sur 4 semaines — la régularité est la clé pour progresser.");
  if (trends.length === 0) trends.push("Pas encore assez de données pour analyser les tendances.");

  // ── Section 3 : Plan 4 semaines ──
  const planWeeks = buildLocalPlan(raceKm, daysLeft, weeklyTarget, level);

  // ── Section 4 : Chiens ──
  const dogAdvice = [];
  if (dogs.length === 0) {
    dogAdvice.push("Aucun chien enregistré. Ajoute tes chiens dans l'onglet Chiens pour des conseils personnalisés.");
  } else {
    dogs.forEach((dog) => {
      const age = Number(dog.age || 0);
      const sig = dog.healthSignal || "ok";
      if (age >= 8) dogAdvice.push(`🐕 ${dog.name} (${age} ans) : chien sénior — réduis les sorties longues, surveille les articulations et augmente la récupération.`);
      else if (age <= 1) dogAdvice.push(`🐕 ${dog.name} (${age} an) : jeune chien — limite à 20-30 min par sortie, pas de longue distance avant 18 mois.`);
      if (sig === "fatigue" || sig === "blessure") dogAdvice.push(`⚠️ ${dog.name} signalé en ${sig} — repos obligatoire, consulte un vétérinaire si ça dure.`);
    });
    if (dogAdvice.length === 0) dogAdvice.push("Chiens dans de bonnes conditions. Continue à surveiller leur énergie et leur appétit après chaque sortie.");
  }

  // ── Section 5 : Actions prioritaires ──
  const actions = [];
  if (runCount === 0) {
    actions.push("Enregistre ta première sortie pour débloquer l'analyse complète.");
  } else {
    if (km1w < weeklyTarget * 0.7) actions.push(`Planifie une sortie de ${Math.round(weeklyTarget * 0.4)} km cette semaine pour rattraper le volume cible.`);
    if (runs1w.length === 0) actions.push("Aucune sortie cette semaine — reprends dès que possible avec une sortie facile.");
    if (daysLeft !== null && daysLeft <= 14 && daysLeft > 0) actions.push(`Course dans ${daysLeft} jours — réduction du volume à 50%, sorties courtes et vives uniquement.`);
    if (dogs.some((d) => d.healthSignal === "fatigue" || d.healthSignal === "blessure")) actions.push("Mettre au repos les chiens signalés fatigués ou blessés avant toute prochaine sortie.");
    if (actions.length < 3 && avgSpeed > 0 && avgSpeed < 12) actions.push("Intègre une sortie avec des intervals courts (3 × 3 min rapides) pour améliorer la vitesse.");
    if (actions.length < 3) actions.push("Maintiens la régularité : 3 à 4 sorties par semaine est plus efficace que 1 longue sortie par semaine.");
  }

  // ── Section 6 : Alerte ──
  const alerts = [];
  if (daysLeft !== null && daysLeft < 0) alerts.push(`La date de course ${raceName} est dépassée. Mets à jour ta course objectif dans les Paramètres.`);
  if (weeklyRatio > 1.5) alerts.push(`Volume très élevé cette semaine (${km1w.toFixed(0)} km). Risque de surcharge — insère 2 jours de repos complets.`);
  if (runCount > 0 && runs.every((r) => !r.energy)) alerts.push("Pense à noter l'énergie de tes chiens après chaque sortie — ça permet de détecter la fatigue tôt.");

  // ── Rendu HTML ──
  return `
    <h4>🎯 Évaluation actuelle</h4>
    <p>${evalColor} ${evalNote}</p>
    <p><strong>${totalKm.toFixed(0)} km</strong> totaux · <strong>${runCount}</strong> sortie(s) · vitesse moy. <strong>${avgSpeed > 0 ? avgSpeed.toFixed(1) + " km/h" : "—"}</strong>${daysLeft !== null ? ` · <strong>${daysLeft > 0 ? "J-" + daysLeft : "Course passée"}</strong> avant ${raceName}` : ""}</p>

    <h4>📊 Analyse des tendances</h4>
    <ul>${trends.map((t) => `<li>${t}</li>`).join("")}</ul>

    <h4>🗓️ Plan 4 semaines recommandé</h4>
    ${planWeeks}

    <h4>🐕 Points d'attention sur les chiens</h4>
    <ul>${dogAdvice.map((d) => `<li>${d}</li>`).join("")}</ul>

    <h4>⚡ Actions prioritaires cette semaine</h4>
    <ul>${actions.map((a) => `<li>${a}</li>`).join("")}</ul>

    ${alerts.length > 0 ? `<h4>⚠️ Alertes</h4><ul>${alerts.map((a) => `<li>${a}</li>`).join("")}</ul>` : ""}
  `;
}

function buildLocalPlan(raceKm, daysLeft, weeklyTarget, level) {
  const phase = daysLeft === null ? "Base"
    : daysLeft > 60 ? "Base"
    : daysLeft > 28 ? "Construction"
    : daysLeft > 10 ? "Pic"
    : "Affûtage";

  const weeks = [
    { label: "Semaine 1 (cette semaine)", pct: 1.00 },
    { label: "Semaine 2",                 pct: 1.10 },
    { label: "Semaine 3",                 pct: 1.20 },
    { label: "Semaine 4",                 pct: phase === "Affûtage" ? 0.50 : 0.80 }
  ];

  return `<ul>${weeks.map(({ label, pct }) => {
    const km = (weeklyTarget * pct).toFixed(0);
    const sessions = level === "Compétition" ? "4–5 sorties" : "3–4 sorties";
    const focus = phase === "Base"         ? "endurance, rythme calme"
                : phase === "Construction" ? "volume + 1 sortie soutenue"
                : phase === "Pic"          ? "intensité courte + repos"
                : "sorties légères, récupération";
    return `<li><strong>${label}</strong> — ${km} km · ${sessions} · ${focus} (phase ${phase})</li>`;
  }).join("")}</ul>`;
}

// Convertit le markdown simple (gras, listes, titres) en HTML
function formatCoachMarkdown(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,3} (.+)$/gm, "<h4>$1</h4>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>(\n|$))+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<[hul]|<\/[hul])(.+)$/gm, (m) => m.startsWith("<") ? m : `<p>${m}</p>`)
    .replace(/<p><\/p>/g, "");
}

["race-search-region", "race-search-type", "race-search-distance", "race-search-surface", "race-search-reliability", "race-search-period"].forEach((id) => {
  document.querySelector(`#${id}`)?.addEventListener("input", () => {
    renderRaceSearch();
    fetchRaceRadar();
  });
  document.querySelector(`#${id}`)?.addEventListener("change", () => {
    renderRaceSearch();
    fetchRaceRadar();
  });
});

document.querySelector("#missing-race-button")?.addEventListener("click", reportMissingRace);

// Présets paramètres course
const RACE_PRESETS = {
  sprint:   { name: "Sprint hivernal", type: "Sprint",          km: 12,  months: 3 },
  mid:      { name: "Mid-distance",    type: "Mid-distance",    km: 80,  months: 5 },
  long:     { name: "Longue distance", type: "Longue distance", km: 250, months: 8 },
  canicross:{ name: "Canicross race",  type: "Canicross",       km: 10,  months: 2 }
};
document.querySelectorAll(".preset-btn[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = RACE_PRESETS[btn.dataset.preset];
    if (!preset) return;
    const raceDate = new Date();
    raceDate.setMonth(raceDate.getMonth() + preset.months);
    document.querySelector("#race-name").value = preset.name;
    document.querySelector("#race-type").value = preset.type;
    document.querySelector("#race-km").value   = preset.km;
    document.querySelector("#race-date").value = raceDate.toISOString().slice(0, 10);
    // Surligne visuellement les champs remplis
    ["#race-name","#race-type","#race-km","#race-date"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) { el.style.outline = "2px solid #fc4c02"; setTimeout(() => el.style.outline = "", 1500); }
    });
  });
});

// Filtres conseils par catégorie
document.querySelectorAll(".advice-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    activeAdviceCategory = btn.dataset.adviceCat;
    document.querySelectorAll(".advice-filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderWebAdvice();
  });
});

// Filtres sorties ouvertes
["open-run-filter-type", "open-run-filter-level", "open-run-filter-distance", "open-run-filter-region"].forEach((id) => {
  document.querySelector(`#${id}`)?.addEventListener("input",  () => renderOpenRuns());
  document.querySelector(`#${id}`)?.addEventListener("change", () => renderOpenRuns());
});

render();

document.querySelector("#manual-run-button")?.addEventListener("click", () => {

    const km = prompt("Distance km");
    if (!km) return;

    const speed = prompt("Vitesse moyenne km/h") || 12;

    const type = prompt("Type de sortie") || "Endurance";

    state.runs.unshift({
      date: new Date().toISOString().slice(0, 10),
      type,
      km: Number(km),
      speed: Number(speed),
      team: [...state.selectedDogIds],
      weather: "Ajout manuel",
      energy: 4,
      recovery: "Bonne",
      paws: true,
      hydrated: true,
      notes: "Sortie ajoutee manuellement",
      path: []
    });

    saveState();
    render();
});

setTimeout(() => {
  initMap();
}, 500);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

// ── Classement communautaire ──────────────────────────────────────────────────
async function fetchLeaderboard() {
  const wrap = document.getElementById("leaderboard-wrap");
  if (!wrap) return;
  const month = new Date().toISOString().slice(0, 7);
  const label = document.getElementById("leaderboard-month");
  if (label) {
    const [y, m] = month.split("-");
    label.textContent = new Date(Number(y), Number(m) - 1, 1)
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  // Calcul local : km ce mois pour l'utilisateur courant
  const myKm = state.runs
    .filter(r => r.date && r.date.startsWith(month))
    .reduce((s, r) => s + Number(r.km || 0), 0);

  // Push vers Supabase (silencieux)
  if (myKm > 0 && state.profile.name) {
    fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: state.deviceId,
        name: state.profile.name,
        region: state.profile.region || "",
        monthKm: Math.round(myKm * 10) / 10,
        month
      })
    }).catch(() => {});
  }

  // Fetch classement
  try {
    const res  = await fetch(`/api/leaderboard?month=${month}`);
    const data = await res.json();
    if (!data.configured || !data.entries?.length) {
      wrap.innerHTML = renderLeaderboardLocal(myKm, month);
      return;
    }
    // Injecte l'entrée locale si absente du serveur
    let entries = data.entries;
    const meInList = entries.some(e => e.device_id === state.deviceId);
    if (!meInList && myKm > 0 && state.profile.name) {
      entries = [...entries, { device_id: state.deviceId, name: state.profile.name, region: state.profile.region || "", month_km: myKm }];
      entries.sort((a, b) => b.month_km - a.month_km);
    }
    wrap.innerHTML = renderLeaderboardRows(entries, myKm);
  } catch {
    wrap.innerHTML = renderLeaderboardLocal(myKm, month);
  }
}

function renderLeaderboardLocal(myKm, month) {
  if (myKm === 0) {
    return `<p class="leaderboard-empty">Enregistre ta première sortie ce mois-ci pour apparaître dans le classement !</p>`;
  }
  return renderLeaderboardRows([{
    device_id: state.deviceId,
    name: state.profile.name || "Toi",
    region: state.profile.region || "",
    month_km: myKm
  }], myKm);
}

function renderLeaderboardRows(entries, myKm) {
  const medals = ["🥇", "🥈", "🥉"];
  return `<div class="leaderboard">` +
    entries.slice(0, 15).map((e, i) => {
      const isMe = e.device_id === state.deviceId;
      return `<div class="leaderboard-row ${isMe ? "me" : ""}">
        <span class="lb-rank">${medals[i] || `${i + 1}.`}</span>
        <div class="lb-info">
          <strong>${e.name || "Musher"}</strong>
          ${e.region ? `<small>${e.region}</small>` : ""}
        </div>
        <span class="lb-km">${Math.round(e.month_km * 10) / 10} km</span>
      </div>`;
    }).join("") +
  `</div>`;
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Calculateur de ration alimentaire ────────────────────────────────────────
function calcRation(weightKg, weekKm, kcalPer100g, season, raceType) {
  // Maintenance NRC : 132 × kg^0.75 kcal/jour
  const maint = 132 * Math.pow(weightKg, 0.75);

  let exercise, baseLabel;

  if (raceType === "Canicross" || raceType === "Dryland") {
    // Canicross / dryland : approche kcal/kg/jour selon intensité hebdo
    // (les courses sont courtes mais rapides → coût glycolytique élevé + récupération)
    // Source : 100–200 kcal/kg/jour selon le niveau (littérature vétérinaire sportive)
    let kcalPerKgDay, niveauLabel;
    if (weekKm < 20) {
      kcalPerKgDay = 110; niveauLabel = "loisir (<20 km/sem)";
    } else if (weekKm < 50) {
      kcalPerKgDay = 145; niveauLabel = "régulier (20–50 km/sem)";
    } else {
      kcalPerKgDay = 185; niveauLabel = "intensif/compétition (>50 km/sem)";
    }
    const totalTarget = kcalPerKgDay * weightKg;
    exercise  = Math.max(0, totalTarget - maint);
    baseLabel = `🏃 Canicross ${niveauLabel} — ${kcalPerKgDay} kcal/kg/jour`;
  } else {
    // Mushing traîneau : approche kcal/kg/km
    // Hiver : 4.0 kcal/kg/km (traîneau, froid, thermorégulation — Hinchcliff et al.)
    // Été   : 2.5 kcal/kg/km (dryland été, pas de thermogenèse hivernale)
    const kcalPerKgKm = (season === "summer") ? 2.5 : 4.0;
    const dailyKm     = weekKm / 7;
    exercise  = kcalPerKgKm * weightKg * dailyKm;
    baseLabel = season === "summer"
      ? `☀️ Base été — ${kcalPerKgKm} kcal/kg/km (traîneau dryland, chaleur)`
      : `❄️ Base hiver — ${kcalPerKgKm} kcal/kg/km (traîneau en froid — études Iditarod)`;
  }

  const totalKcal = maint + exercise;
  const grams     = Math.round((totalKcal / kcalPer100g) * 100);
  return { grams, totalKcal: Math.round(totalKcal), maint: Math.round(maint), exercise: Math.round(exercise), baseLabel };
}

document.getElementById("toggle-ration-calc")?.addEventListener("click", () => {
  const panel = document.getElementById("ration-calc");
  if (!panel) return;
  panel.classList.toggle("hidden");
  document.getElementById("toggle-ration-calc").textContent =
    panel.classList.contains("hidden") ? "Calculer ▾" : "Fermer ▴";
  // Pré-remplit poids moyen de l'attelage
  if (!panel.classList.contains("hidden") && state.dogs.length > 0) {
    const avgWeight = state.dogs.reduce((s, d) => s + Number(d.weight || 25), 0) / state.dogs.length;
    const weekKm    = Math.round(state.runs.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date + "T12:00:00");
      const monday = new Date(); monday.setDate(monday.getDate() - monday.getDay() + 1); monday.setHours(0,0,0,0);
      return d >= monday;
    }).reduce((s, r) => s + Number(r.km || 0), 0));
    const weightEl = document.getElementById("ration-weight");
    const kmEl     = document.getElementById("ration-km");
    if (weightEl && !weightEl.value) weightEl.value = Math.round(avgWeight * 2) / 2;
    if (kmEl && !kmEl.value)         kmEl.value = weekKm;
  }
});

document.getElementById("calc-ration-btn")?.addEventListener("click", () => {
  const weight  = parseFloat(document.getElementById("ration-weight")?.value || 0);
  const km      = parseFloat(document.getElementById("ration-km")?.value || 0);
  const density = parseFloat(document.getElementById("ration-density")?.value || 360);
  const result  = document.getElementById("ration-result");
  if (!weight || !result) return;

  const season   = state.seasonMode || "winter";
  const raceType = state.raceType   || "";
  const { grams, totalKcal, maint, exercise, baseLabel } = calcRation(weight, km, density, season, raceType);
  const intensity = km === 0 ? "repos complet" : km < 20 ? "faible activité" : km < 50 ? "activité modérée" : "haute performance";

  result.classList.remove("hidden");
  result.innerHTML = `
    <div class="ration-output">
      <div class="ration-main">
        <span class="ration-label">Ration journalière recommandée</span>
        <strong class="ration-value">${grams} g / jour</strong>
        <small>${totalKcal} kcal/jour · ${intensity}</small>
      </div>
      <div class="ration-breakdown">
        <span>🏠 Maintenance</span><span>${maint} kcal</span>
        <span>🏃 Exercice</span><span>${exercise} kcal</span>
        <span style="grid-column:1/-1;font-size:0.75rem;color:#888;margin-top:4px">${baseLabel}</span>
      </div>
      ${state.dogs.length > 1 ? `
      <div class="ration-team">
        <strong>Pour tout l'attelage (${state.dogs.length} chiens)</strong>
        <span>${Math.round(grams * state.dogs.length / 100) * 100} g/jour total</span>
      </div>` : ""}
      <p class="ration-note">⚠️ Indicatif uniquement. Ajuste selon l'état corporel et consulte ton vétérinaire.</p>
    </div>
  `;
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Mode Coach ───────────────────────────────────────────────────────────────

function weatherCodeEmoji(code) {
  if (code == null) return "🌡️";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

function renderCoach() {
  const el = document.getElementById("coach-content");
  if (!el) return;

  const plan = generateCoachPlan();
  const today = new Date(); today.setHours(0,0,0,0);
  const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const PHASE_COLORS = { base: "#3b82f6", build: "#f59e0b", peak: "#fc4c02", taper: "#22c55e" };
  const PHASE_LABELS = { base: "Phase de base", build: "Construction", peak: "Pic de forme", taper: "Affûtage" };

  // Vet reminders
  const vetAlerts = [];
  for (const dog of state.dogs) {
    for (const ev of (dog.healthHistory || [])) {
      if (!ev.nextDue) continue;
      const due  = new Date(ev.nextDue + "T12:00:00");
      const days = Math.round((due - today) / 86400000);
      if (days >= -3 && days <= 14) vetAlerts.push({ dog: dog.name, type: ev.type, days, notes: ev.notes || "" });
    }
  }
  vetAlerts.sort((a, b) => a.days - b.days);

  const phaseColor = PHASE_COLORS[plan.phase] || "#fc4c02";

  el.innerHTML = `
    <!-- En-tête objectif -->
    <div style="background:linear-gradient(135deg,#1a1a2e,${phaseColor});border-radius:16px;padding:18px;color:#fff;margin:16px 0 12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:.08em;opacity:.75">${PHASE_LABELS[plan.phase]}</p>
        ${plan.isDeloadWeek ? `<span style="background:rgba(255,255,255,0.2);border-radius:8px;padding:2px 8px;font-size:0.68rem;font-weight:700">📉 SEMAINE DÉCHARGE</span>` : ""}
      </div>
      <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:8px">${plan.raceName || "Objectif saison"}</h2>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px">
        <div><strong style="font-size:1.4rem">${plan.weeksLeft}</strong><span style="font-size:0.78rem;opacity:.8;margin-left:4px">semaines</span></div>
        <div><strong style="font-size:1.4rem">${plan.weekTarget}</strong><span style="font-size:0.78rem;opacity:.8;margin-left:4px">km/sem cible</span></div>
        <div><strong style="font-size:1.4rem">${plan.weekDone.toFixed(0)}</strong><span style="font-size:0.78rem;opacity:.8;margin-left:4px">km cette sem.</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:0.75rem;opacity:.8">Niveau : <strong>${plan.trainingLevel}</strong></span>
        ${plan.progressPct !== null ? `<span style="font-size:0.75rem;opacity:.8">· Progression : <strong>${plan.progressPct > 0 ? "+" : ""}${plan.progressPct}%</strong> vs sem. passée</span>` : ""}
      </div>
    </div>

    <!-- Graphique 4 semaines -->
    <div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:12px;border:1px solid #f0f0f0">
      <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:.08em;color:#999;font-weight:700;margin-bottom:10px">Volume 4 semaines (km)</p>
      <div style="display:flex;align-items:flex-end;gap:6px;height:60px">
        ${(() => {
          const weeks4 = plan.weeklyKm.slice(4); // 4 dernières semaines
          const maxK   = Math.max(...weeks4, 1);
          const labels = ["S-3","S-2","S-1","Cette sem."];
          return weeks4.map((k, i) => {
            const h   = Math.round((k / maxK) * 52);
            const col = i === 3 ? phaseColor : "#e5e7eb";
            const txtCol = i === 3 ? phaseColor : "#666";
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <span style="font-size:0.68rem;font-weight:700;color:${txtCol}">${k > 0 ? Math.round(k) : ""}</span>
              <div style="width:100%;height:${h}px;background:${col};border-radius:4px 4px 0 0;min-height:${k > 0 ? 4 : 0}px"></div>
              <span style="font-size:0.62rem;color:#aaa">${labels[i]}</span>
            </div>`;
          }).join("");
        })()}
      </div>
    </div>

    <!-- Alertes véto -->
    ${vetAlerts.length ? `
    <div style="margin-bottom:12px">
      ${vetAlerts.map(v => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${v.days < 0 ? "#fff1f1" : v.days <= 3 ? "#fff8f0" : "#f0fff4"};border-radius:12px;border:1px solid ${v.days < 0 ? "#fca5a5" : v.days <= 3 ? "#fdba74" : "#86efac"};margin-bottom:6px">
          <span style="font-size:1.3rem">${v.type === "vaccin" ? "💉" : "🐛"}</span>
          <div>
            <strong style="font-size:0.88rem">${v.type === "vaccin" ? "Vaccin" : "Vermifuge"} — ${v.dog}</strong>
            <small style="display:block;font-size:0.75rem;color:#666">${v.days < 0 ? `En retard de ${Math.abs(v.days)}j` : v.days === 0 ? "Aujourd'hui !" : `Dans ${v.days} jour${v.days > 1 ? "s" : ""}`}${v.notes ? " · " + v.notes : ""}</small>
          </div>
        </div>`).join("")}
    </div>` : ""}

    <!-- Plan hebdo -->
    <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:.08em;color:#999;font-weight:700;margin-bottom:8px">Plan de la semaine</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
      ${plan.days.map((day, i) => {
        const date = new Date(today); date.setDate(today.getDate() - today.getDay() + 1 + i);
        const isToday = date.toDateString() === today.toDateString();
        const isPast  = date < today;
        return `
        <div style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;background:${isToday ? "#fff4f0" : "#fff"};border-radius:12px;border:${isToday ? "2px solid #fc4c02" : "1px solid #f0f0f0"};opacity:${isPast ? "0.6" : "1"}">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:36px;text-align:center;flex-shrink:0">
              <div style="font-size:0.68rem;color:#999;font-weight:700">${DAY_NAMES[(date.getDay())]}</div>
              <div style="font-size:1.1rem;font-weight:800;color:${isToday ? "#fc4c02" : "#333"}">${date.getDate()}</div>
            </div>
            <div style="width:36px;height:36px;border-radius:50%;background:${day.rest ? "#f5f5f5" : day.color + "18"};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${day.emoji}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:0.9rem;font-weight:700;color:#1a1a1a">${day.label}</div>
              <div style="font-size:0.78rem;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${day.desc}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              ${day.weatherEmoji ? `<div style="font-size:1rem">${day.weatherEmoji}${day.weatherTemp != null ? `<span style="font-size:0.72rem;color:#999;margin-left:2px">${day.weatherTemp}°</span>` : ""}</div>` : ""}
              ${day.km ? `<div style="font-size:0.88rem;font-weight:700;color:${day.color}">${day.km} km</div>` : ""}
            </div>
          </div>
          ${day.weatherWarning ? `<div style="font-size:0.75rem;color:#b45309;background:#fffbeb;border-radius:6px;padding:4px 8px">${day.weatherWarning}</div>` : ""}
        </div>`;
      }).join("")}
    </div>

    <!-- Conseil du coach -->
    <div style="background:#f8f9ff;border-radius:14px;padding:16px;border-left:4px solid ${phaseColor};margin-bottom:16px">
      <p style="font-size:0.72rem;font-weight:700;color:${phaseColor};text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Conseil du coach</p>
      <p style="font-size:0.88rem;color:#444;line-height:1.5">${plan.advice}</p>
    </div>

    <!-- Chiens à surveiller -->
    ${plan.dogAlerts.length ? `
    <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:.08em;color:#999;font-weight:700;margin-bottom:8px">Chiens à surveiller</p>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
      ${plan.dogAlerts.map(a => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border-radius:12px;border:1px solid #f0f0f0">
          <span style="font-size:1.2rem">${a.emoji}</span>
          <div><strong style="font-size:0.88rem">${a.name}</strong><small style="display:block;font-size:0.75rem;color:#888">${a.msg}</small></div>
        </div>`).join("")}
    </div>` : ""}

    <!-- Rapport mensuel -->
    <div style="margin-bottom:20px">
      <p style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px">Rapport mensuel</p>
      ${renderMonthlyReport()}
    </div>

    <!-- Corrélation météo/performance -->
    <div style="margin-bottom:20px">
      <p style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px">Météo & performance</p>
      ${renderWeatherCorrelation()}
    </div>
  `;
}

function renderMonthlyReport() {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;

  const monthRuns = state.runs.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const prevRuns = state.runs.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const totalKm   = monthRuns.reduce((s, r) => s + Number(r.km), 0);
  const prevKm    = prevRuns.reduce((s, r) => s + Number(r.km), 0);
  const bestRun   = monthRuns.reduce((best, r) => (!best || Number(r.km) > Number(best.km)) ? r : best, null);
  const avgRecov  = monthRuns.filter(r => r.recovery).length
    ? monthRuns.filter(r => r.recovery).reduce((s, r) => s + (r.recovery === "excellent" ? 3 : r.recovery === "good" ? 2 : 1), 0) / monthRuns.filter(r => r.recovery).length
    : null;
  const recovLabel = avgRecov ? (avgRecov >= 2.5 ? "Excellente" : avgRecov >= 1.5 ? "Bonne" : "Faible") : "—";
  const recovColor = avgRecov ? (avgRecov >= 2.5 ? "#22c55e" : avgRecov >= 1.5 ? "#f59e0b" : "#ef4444") : "#888";
  const diff      = prevKm ? Math.round(((totalKm - prevKm) / prevKm) * 100) : null;
  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (!monthRuns.length) return `<div style="background:#f9f9f9;border-radius:14px;padding:16px;text-align:center;color:#aaa;font-size:0.85rem">Aucune sortie ce mois-ci.</div>`;

  return `
    <div style="background:#f9f9f9;border-radius:14px;padding:16px">
      <p style="font-size:0.82rem;font-weight:700;color:#333;margin:0 0 12px;text-transform:capitalize">${monthName}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:#fff;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:1.4rem;font-weight:800;color:#fc4c02">${totalKm.toFixed(0)}<small style="font-size:0.7rem"> km</small></div>
          <div style="font-size:0.7rem;color:#888">Total ${diff !== null ? `<span style="color:${diff >= 0 ? "#22c55e" : "#ef4444"}">${diff >= 0 ? "+" : ""}${diff}% vs mois préc.</span>` : ""}</div>
        </div>
        <div style="background:#fff;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:1.4rem;font-weight:800;color:#333">${monthRuns.length}</div>
          <div style="font-size:0.7rem;color:#888">sortie${monthRuns.length > 1 ? "s" : ""}</div>
        </div>
        <div style="background:#fff;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:1.1rem;font-weight:800;color:#333">${bestRun ? Number(bestRun.km).toFixed(1) + " km" : "—"}</div>
          <div style="font-size:0.7rem;color:#888">meilleure sortie${bestRun ? " · " + new Date(bestRun.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}</div>
        </div>
        <div style="background:#fff;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:1.1rem;font-weight:800;color:${recovColor}">${recovLabel}</div>
          <div style="font-size:0.7rem;color:#888">récupération moy.</div>
        </div>
      </div>
    </div>`;
}

function renderWeatherCorrelation() {
  const runsWithTemp = state.runs.filter(r => r.temp !== null && r.temp !== undefined && r.km);
  if (runsWithTemp.length < 3) return `<div style="background:#f9f9f9;border-radius:14px;padding:16px;text-align:center;color:#aaa;font-size:0.85rem">Pas encore assez de données.<br><small>La température est enregistrée automatiquement à chaque sortie.</small></div>`;

  // Grouper par tranche de 5°C
  const buckets = {};
  for (const r of runsWithTemp) {
    const bucket = Math.floor(r.temp / 5) * 5;
    buckets[bucket] = buckets[bucket] || [];
    buckets[bucket].push(Number(r.km));
  }
  const sorted = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  const maxAvg = Math.max(...sorted.map(k => buckets[k].reduce((s, v) => s + v, 0) / buckets[k].length));

  const bars = sorted.map(k => {
    const avg  = buckets[k].reduce((s, v) => s + v, 0) / buckets[k].length;
    const pct  = Math.round((avg / maxAvg) * 100);
    const col  = k <= -10 ? "#60a5fa" : k <= 0 ? "#93c5fd" : k <= 10 ? "#4ade80" : k <= 20 ? "#facc15" : "#f87171";
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <span style="font-size:0.68rem;color:#888;width:44px;text-align:right;flex-shrink:0">${k >= 0 ? "+" : ""}${k}°C</span>
      <div style="flex:1;background:#e5e7eb;border-radius:6px;height:16px;overflow:hidden">
        <div style="width:${pct}%;background:${col};height:100%;border-radius:6px"></div>
      </div>
      <span style="font-size:0.68rem;color:#666;width:36px;flex-shrink:0">${avg.toFixed(1)} km</span>
    </div>`;
  }).join("");

  const best = sorted.reduce((b, k) => {
    const avg = buckets[k].reduce((s, v) => s + v, 0) / buckets[k].length;
    return (!b || avg > b.avg) ? { k, avg } : b;
  }, null);

  return `
    <div style="background:#f9f9f9;border-radius:14px;padding:16px">
      <p style="font-size:0.78rem;color:#444;margin:0 0 12px">Km moyen par tranche de température — ${runsWithTemp.length} sorties analysées</p>
      ${bars}
      ${best ? `<p style="font-size:0.78rem;color:#fc4c02;font-weight:700;margin:10px 0 0">🎯 Meilleure condition : ${best.k >= 0 ? "+" : ""}${best.k}°C à ${best.k + 4}°C (${best.avg.toFixed(1)} km en moyenne)</p>` : ""}
    </div>`;
}

function generateCoachPlan() {
  const today    = new Date(); today.setHours(0,0,0,0);
  const raceDate = new Date((state.raceDate || "2027-01-01") + "T12:00:00");
  const weeksLeft = Math.max(0, Math.ceil((raceDate - today) / (7 * 86400000)));
  const raceKm   = Number(state.raceKm) || 100;
  const raceType = state.raceType || "Mid-distance";

  // ── Km des 8 dernières semaines (pour progression réelle) ─────────────────
  const weeklyKm = [];
  for (let w = 0; w < 8; w++) {
    const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7) - w * 7);
    const sun = new Date(mon);   sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59);
    const km  = state.runs
      .filter(r => { const d = new Date(r.date + "T12:00:00"); return d >= mon && d <= sun; })
      .reduce((s, r) => s + (Number(r.km) || 0), 0);
    weeklyKm.unshift(km); // index 0 = il y a 7 semaines, index 7 = semaine actuelle
  }
  const weekDone    = weeklyKm[7];
  const lastWeekKm  = weeklyKm[6];  // semaine passée
  const avgKm4weeks = weeklyKm.slice(3, 7).reduce((s, k) => s + k, 0) / 4 || 0;

  // ── Niveau d'entraînement actuel ──────────────────────────────────────────
  let trainingLevel;
  if (avgKm4weeks < 20)       trainingLevel = "Débutant";
  else if (avgKm4weeks < 40)  trainingLevel = "Intermédiaire";
  else if (avgKm4weeks < 80)  trainingLevel = "Avancé";
  else if (avgKm4weeks < 150) trainingLevel = "Performant";
  else                         trainingLevel = "Longue distance";

  // ── Semaine de décharge ? (toutes les 4 sem) ─────────────────────────────
  // On compte le nb de semaines depuis le début de la saison (1er sept ou 1er mars selon mode)
  const seasonStart = state.seasonMode === "summer"
    ? new Date(today.getFullYear(), 2, 1)   // 1er mars
    : new Date(today.getFullYear(), 8, 1);  // 1er sept
  const weeksSinceStart = Math.floor((today - seasonStart) / (7 * 86400000));
  const isDeloadWeek = (weeksSinceStart % 4 === 3); // 4e semaine = décharge

  // ── Cible hebdo ───────────────────────────────────────────────────────────
  // Phase selon les semaines avant la course
  let phase;
  if (weeksLeft > 12)      phase = "base";
  else if (weeksLeft > 6)  phase = "build";
  else if (weeksLeft > 2)  phase = "peak";
  else                      phase = "taper";

  // Cible = progression +8%/sem depuis la moyenne des 4 dernières semaines
  // Plafonnée par la phase de course
  const PHASE_MAX = { base: raceKm * 0.20, build: raceKm * 0.30, peak: raceKm * 0.35, taper: raceKm * 0.12 };
  let weekTarget = Math.round(Math.min(
    (avgKm4weeks > 0 ? avgKm4weeks * 1.08 : raceKm * 0.12),
    PHASE_MAX[phase]
  ));
  if (isDeloadWeek) weekTarget = Math.round(weekTarget * 0.75); // -25% semaine décharge
  weekTarget = Math.max(weekTarget, 10);

  // ── Charge d'entraînement (distance × vitesse estimée) ──────────────────
  // Utilise les sorties réelles si dispo, sinon vitesse estimée par type
  const SPEED_EST = { endurance: 14, long: 12, sprint: 18, recup: 10, technique: 12, rest: 0 };

  // ── Sessions types ────────────────────────────────────────────────────────
  const SESSION_TYPES = {
    endurance: { label: "Endurance",     emoji: "🏃", color: "#3b82f6", desc: "70–80% effort max, rythme conversationnel" },
    long:      { label: "Sortie longue", emoji: "🌲", color: "#059669", desc: "Pace lent, hydratation toutes les 8–10 km" },
    sprint:    { label: "Sprint",        emoji: "⚡", color: "#fc4c02", desc: "Intervalles 2–3 km haute intensité" },
    recup:     { label: "Récupération",  emoji: "🐾", color: "#8b5cf6", desc: "Allure douce, pattes et harnais contrôlés" },
    rest:      { label: "Repos",         emoji: "😴", color: "#94a3b8", desc: "Jeu libre, massage, observation", rest: true },
    technique: { label: "Technique",     emoji: "🎯", color: "#f59e0b", desc: "Commandes, départs, dépassements" },
  };

  // ── Distribution 7 jours (lun→dim) ───────────────────────────────────────
  // Règle : weekend = 60–70% du volume (2 sorties longues back-to-back)
  // Ratio km par type (rapporté à 1)
  const PLANS = {
    base:  ["endurance","rest","endurance","rest","long","long","rest"],
    build: ["endurance","sprint","rest","endurance","long","long","rest"],
    peak:  ["sprint","endurance","rest","endurance","long","long","recup"],
    taper: ["recup","rest","endurance","rest","recup","rest","rest"],
  };
  // Ratios : les deux "long" du weekend = 32% + 32% = 64% du volume total
  const KM_RATIO = { endurance: 0.18, long: 0.32, sprint: 0.10, recup: 0.07, technique: 0.09, rest: 0 };

  const dayTypes = PLANS[phase];
  const totalRatio = dayTypes.reduce((s, t) => s + (KM_RATIO[t] || 0), 0);

  // Lundi de la semaine en cours
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = dayTypes.map((type, i) => {
    const dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
    const dateKey = dayDate.toISOString().slice(0, 10);
    const fcst = (state.forecast || {})[dateKey] || null;

    // Adaptation météo
    let finalType = type;
    let weatherWarning = null;
    let weatherEmoji = null;
    let weatherTemp = null;
    if (fcst) {
      weatherTemp = Math.round(fcst.tempMax);
      weatherEmoji = weatherCodeEmoji(fcst.code);
      if (fcst.tempMax > 28 && !SESSION_TYPES[type].rest) {
        finalType = "rest";
        weatherWarning = `⚠️ ${weatherTemp}°C — repos conseillé (chaleur)`;
      } else if (fcst.tempMax > 22 && type === "sprint") {
        finalType = "recup";
        weatherWarning = `⚠️ ${weatherTemp}°C — sprint remplacé par récupération`;
      } else if (fcst.tempMax > 22 && type === "long") {
        weatherWarning = `🌡️ ${weatherTemp}°C — départ tôt, eau obligatoire`;
      }
    }

    const s  = SESSION_TYPES[finalType];
    const km = s.rest ? 0 : Math.round((KM_RATIO[finalType] / totalRatio) * weekTarget);
    const charge = km * (SPEED_EST[finalType] || 12);
    return { ...s, km: km || null, type: finalType, origType: type, charge: km ? charge : null, dateKey, weatherWarning, weatherEmoji, weatherTemp };
  });

  // ── Indicateur de progression ─────────────────────────────────────────────
  const progressPct = lastWeekKm > 0 ? Math.round(((weekTarget - lastWeekKm) / lastWeekKm) * 100) : null;

  // ── Conseils par phase ────────────────────────────────────────────────────
  const deloadNote = isDeloadWeek ? " Cette semaine est une semaine de décharge — volume réduit de 25% pour permettre la supercompensation." : "";
  const ADVICE = {
    base:  `Phase de base : priorité au volume à basse intensité (70–80% de l'effort max). Objectif ${weekTarget} km avec les deux sorties longues du week-end en back-to-back. Progression de 8%/sem maximum.${deloadNote}`,
    build: `Construction en cours — ${weeksLeft} semaines avant la course. Intègre les intervalles (sprint) et conserve les back-to-back du week-end. Si un chien refuse le départ ou mange moins, réduis son volume de 20% cette semaine.${deloadNote}`,
    peak:  `Phase de pointe ! ${weeksLeft} semaines avant ${state.raceName || "la course"}. Fais au moins une sortie à l'allure de course. Les back-to-back samedi-dimanche simulent la fatigue accumulée. Contrôle les pattes après chaque sortie.${deloadNote}`,
    taper: `Affûtage final — réduis le volume de 40–50% mais garde l'intensité courte. Tes chiens doivent arriver frais et motivés. Prépare le matériel, fais la checklist pré-course. Plus qu'à gérer l'excitation au départ !`,
  };

  // ── Alertes chiens ────────────────────────────────────────────────────────
  const dogAlerts = [];
  for (const dog of state.dogs) {
    const fatigue = getDogFatigueIndex ? getDogFatigueIndex(dog.id) : 0;
    if (fatigue > 1.4) dogAlerts.push({ name: dog.name, emoji: "🔴", msg: "Fatigue élevée — réduire le volume cette semaine" });
    else if (fatigue > 1.0) dogAlerts.push({ name: dog.name, emoji: "🟡", msg: "Charge normale — surveiller la récupération" });
  }

  return {
    phase, weeksLeft, weekTarget, weekDone, raceName: state.raceName,
    days, advice: ADVICE[phase], dogAlerts,
    trainingLevel, isDeloadWeek, weeklyKm, lastWeekKm, progressPct, avgKm4weeks
  };
}

// ── Rappels personnalisables ──────────────────────────────────────────────────
function renderReminders() {
  const list = document.getElementById("reminder-list");
  if (!list) return;
  const reminders = state.reminders || [];
  const today = new Date(); today.setHours(0,0,0,0);

  if (reminders.length === 0) {
    list.innerHTML = `<p class="empty-state" style="font-size:0.83rem;color:#aaa;padding:8px 0">Aucun rappel configuré.</p>`;
    return;
  }

  list.innerHTML = reminders.map((r, i) => {
    const due  = new Date(r.date + "T12:00:00");
    const days = Math.round((due - today) / 86400000);
    const badge = days < 0 ? "overdue" : days <= 3 ? "urgent" : days <= 14 ? "soon" : "";
    const label = days < 0 ? `En retard de ${Math.abs(days)} j`
      : days === 0 ? "Aujourd'hui !"
      : days === 1 ? "Demain"
      : `Dans ${days} jour${days > 1 ? "s" : ""}`;
    return `<div class="reminder-item ${badge}">
      <div class="reminder-body">
        <strong>${r.title}</strong>
        <small>${label}${r.interval ? ` · répète tous les ${r.interval} j` : ""}</small>
      </div>
      <button class="reminder-del" data-del-reminder="${i}" type="button">✕</button>
    </div>`;
  }).join("");

  list.querySelectorAll("[data-del-reminder]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.reminders.splice(Number(btn.dataset.delReminder), 1);
      saveState();
      renderReminders();
    });
  });
}

document.getElementById("add-reminder-btn")?.addEventListener("click", () => {
  const form = document.getElementById("reminder-form");
  if (!form) return;
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) {
    const d = document.getElementById("reminder-date");
    if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
  }
});

document.getElementById("reminder-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const title    = document.getElementById("reminder-title")?.value.trim();
  const date     = document.getElementById("reminder-date")?.value;
  const interval = document.getElementById("reminder-repeat")?.value || "";
  if (!title || !date) return;
  if (!Array.isArray(state.reminders)) state.reminders = [];
  state.reminders.push({ id: `rem-${Date.now()}`, title, date, interval: interval ? Number(interval) : null });
  state.reminders.sort((a, b) => a.date.localeCompare(b.date));
  saveState();
  renderReminders();
  document.getElementById("reminder-form").classList.add("hidden");
  document.getElementById("reminder-title").value = "";
});

// Vérifie les rappels au démarrage
function checkReminders() {
  if (!Array.isArray(state.reminders)) return;
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  state.reminders = state.reminders.map(r => {
    if (r.date <= today && r.interval) {
      // Avance à la prochaine occurrence
      const next = new Date(r.date + "T12:00:00");
      while (next.toISOString().slice(0, 10) <= today) {
        next.setDate(next.getDate() + r.interval);
      }
      changed = true;
      return { ...r, date: next.toISOString().slice(0, 10) };
    }
    return r;
  });
  if (changed) saveState();
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Export PDF rapport de saison ──────────────────────────────────────────────
document.getElementById("export-pdf-btn")?.addEventListener("click", exportSeasonPDF);

// ── Export CSV sorties ────────────────────────────────────────────────────────
document.getElementById("export-csv-btn")?.addEventListener("click", () => {
  const runs = state.runs || [];
  if (!runs.length) { alert("Aucune sortie à exporter."); return; }

  const header = ["Date", "Distance (km)", "Durée (min)", "Vitesse moy (km/h)", "Chiens", "Récupération", "Notes"];
  const rows = runs.map(r => [
    r.date || "",
    Number(r.km || 0).toFixed(2),
    r.duration ? Math.round(r.duration / 60) : "",
    (r.duration && r.km) ? (r.km / (r.duration / 3600)).toFixed(1) : "",
    (r.dogIds || []).map(id => { const d = state.dogs.find(dd => dd.id === id); return d ? d.name : id; }).join(" / "),
    r.recovery || "",
    (r.notes || "").replace(/"/g, "'")
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(v => `"${v}"`).join(";"))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `mushtrack-sorties-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Suppression de compte RGPD ────────────────────────────────────────────────
document.getElementById("delete-account-btn")?.addEventListener("click", () => {
  document.getElementById("delete-account-confirm").style.display = "block";
});

document.getElementById("delete-account-cancel")?.addEventListener("click", () => {
  document.getElementById("delete-account-confirm").style.display = "none";
});

document.getElementById("delete-account-confirm-btn")?.addEventListener("click", async () => {
  const statusEl = document.getElementById("delete-account-status");
  statusEl.style.display = "block";
  statusEl.style.color   = "#888";
  statusEl.textContent   = "Suppression en cours…";

  try {
    const deviceId = state.deviceId;
    const slug     = localStorage.getItem("mushtrack-profile-slug") || "";

    // Supprime dans Supabase (best effort — ne bloque pas si pas connecté)
    await Promise.allSettled([
      supabase.from("mushtrack_user_data").delete().eq("device_id", deviceId),
      supabase.from("mushtrack_race_interests").delete().eq("device_id", deviceId),
      supabase.from("mushtrack_open_run_participants").delete().eq("device_id", deviceId),
      supabase.from("push_subscriptions").delete().eq("device_id", deviceId),
      slug ? supabase.from("mushtrack_profiles").delete().eq("slug", slug) : Promise.resolve(),
    ]);

    // Efface toutes les données locales
    Object.keys(localStorage).filter(k => k.startsWith("mushtrack")).forEach(k => localStorage.removeItem(k));

    statusEl.style.color   = "#16a34a";
    statusEl.textContent   = "✅ Données supprimées. L'app va se recharger.";
    setTimeout(() => location.reload(), 2000);
  } catch (err) {
    statusEl.style.color   = "#dc2626";
    statusEl.textContent   = "Erreur : " + err.message;
  }
});

// ── Profil public musher ──────────────────────────────────────────────────────
(function initPublicProfile() {
  const slugInput   = document.getElementById("profile-slug");
  const urlPreview  = document.getElementById("profile-url-preview");
  const publishBtn  = document.getElementById("publish-profile-btn");
  const statusEl    = document.getElementById("publish-status");
  const linkWrap    = document.getElementById("profile-link-wrap");
  const linkAnchor  = document.getElementById("profile-public-link");
  const copyBtn     = document.getElementById("copy-profile-link");
  if (!slugInput) return;

  // Pré-remplir depuis le profil sauvegardé ou générer depuis le pseudo
  const savedSlug = localStorage.getItem("mushtrack-profile-slug") || "";
  if (savedSlug) {
    slugInput.value = savedSlug;
    showPublishedLink(savedSlug);
  } else if (state.profile && state.profile.name) {
    slugInput.value = state.profile.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  }

  slugInput.addEventListener("input", () => {
    const raw   = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const slug  = raw.slice(0, 40);
    const origin = location.origin;
    urlPreview.textContent = slug ? `${origin}/musher.html?slug=${slug}` : "";
  });

  publishBtn.addEventListener("click", async () => {
    const slug = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40);
    if (!slug) { alert("Saisis un identifiant URL."); return; }

    publishBtn.disabled = true;
    publishBtn.textContent = "Publication…";
    statusEl.style.display = "block";
    statusEl.textContent   = "Envoi en cours…";

    // Construit le payload public (sans données sensibles)
    const totalKm   = state.runs.reduce((s, r) => s + (Number(r.km) || 0), 0);
    const payload = {
      name:        state.profile.name || "Musher",
      region:      state.profile.region || "",
      level:       state.profile.level || "",
      disciplines: state.profile.disciplines || "",
      seasonMode:  state.seasonMode,
      raceType:    state.raceType,
      totalKm:     Math.round(totalKm * 10) / 10,
      totalRuns:   state.runs.length,
      goalKm:      state.goalKm,
      dogs: state.dogs.map(d => ({
        name:   d.name,
        role:   d.role,
        weight: d.weight,
        km:     Math.round(d.km || 0)
      })),
      agenda: state.agenda
        .filter(a => a.isRace || a.sourceId)
        .map(a => ({
          id:       a.id,
          title:    a.title || a.name,
          name:     a.name,
          date:     a.date,
          km:       a.km,
          category: a.category,
          isRace:   true,
          result:   a.result || null
        }))
    };

    try {
      if (!supabase) throw new Error("Client Supabase non disponible — recharge l'app");

      const { error } = await supabase
        .from("mushtrack_profiles")
        .upsert({ slug, data: payload, updated_at: new Date().toISOString() }, { onConflict: "slug" });

      if (error) throw new Error(error.message);

      localStorage.setItem("mushtrack-profile-slug", slug);
      statusEl.style.display  = "none";
      publishBtn.disabled     = false;
      publishBtn.textContent  = "🌐 Publier mon profil";
      showPublishedLink(slug);
    } catch (err) {
      statusEl.textContent   = "❌ " + err.message;
      statusEl.style.color   = "#d94040";
      statusEl.style.display = "block";
      publishBtn.disabled    = false;
      publishBtn.textContent = "🌐 Publier mon profil";
    }
  });

  copyBtn?.addEventListener("click", () => {
    const url = linkAnchor?.href;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      copyBtn.textContent = "✅ Copié !";
      setTimeout(() => { copyBtn.textContent = "📋 Copier le lien"; }, 2000);
    });
  });

  function showPublishedLink(slug) {
    const url = `${location.origin}/musher.html?slug=${slug}`;
    linkWrap.style.display    = "block";
    linkAnchor.href           = url;
    linkAnchor.textContent    = url;
    urlPreview.textContent    = url;
    slugInput.value           = slug;
  }
})();

// ── Partage de sortie ─────────────────────────────────────────────────────────
document.getElementById("share-run-btn")?.addEventListener("click", shareCurrentRun);

function shareCurrentRun() {
  const canvas = document.getElementById("share-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const km       = pendingRunSummary?.km    ?? 0;
  const speed    = pendingRunSummary?.speed ?? 0;
  const dur      = pendingRunSummary?.duration ?? 0;
  const runType  = document.getElementById("runType")?.value || "Sortie";
  const musher   = state.profile.name || "Musher";
  const dogs     = state.selectedDogIds.map(id => state.dogs.find(d => d.id === id)?.name).filter(Boolean).join(", ") || "";
  const dateStr  = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const durStr   = `${Math.floor(dur/3600)}h${String(Math.floor((dur%3600)/60)).padStart(2,"0")}`;

  // Fond sombre
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, W, H);

  // Bande orange haut
  ctx.fillStyle = "#fc4c02";
  ctx.fillRect(0, 0, W, 8);

  // Tracé GPS simplifié (fond carte)
  if (gpsPath.length > 1) {
    const lats = gpsPath.map(p => Array.isArray(p) ? p[0] : p.lat);
    const lons = gpsPath.map(p => Array.isArray(p) ? p[1] : p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const mapW = W * 0.45, mapH = H - 80, mapX = W * 0.5, mapY = 40;
    const pad = 30;
    const scaleX = (mapW - pad*2) / (maxLon - minLon || 1);
    const scaleY = (mapH - pad*2) / (maxLat - minLat || 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX, mapY, mapW, mapH);
    ctx.clip();

    // Fond carte
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(mapX, mapY, mapW, mapH);

    // Tracé
    ctx.beginPath();
    gpsPath.forEach((p, i) => {
      const pLat = Array.isArray(p) ? p[0] : p.lat;
      const pLon = Array.isArray(p) ? p[1] : p.lon;
      const x = mapX + pad + (pLon - minLon) * scaleX;
      const y = mapY + mapH - pad - (pLat - minLat) * scaleY;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#fc4c02";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";
    ctx.stroke();

    // Point départ / arrivée
    const drawDot = (p, color) => {
      const pLat = Array.isArray(p) ? p[0] : p.lat;
      const pLon = Array.isArray(p) ? p[1] : p.lon;
      const x = mapX + pad + (pLon - minLon) * scaleX;
      const y = mapY + mapH - pad - (pLat - minLat) * scaleY;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    };
    drawDot(gpsPath[0], "#22c55e");
    drawDot(gpsPath[gpsPath.length-1], "#fc4c02");
    ctx.restore();
  } else {
    // Pas de tracé — fond simple
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(W*0.5, 40, W*0.45, H-80);
    ctx.fillStyle = "#333";
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Tracé GPS non disponible", W*0.72, H/2);
  }

  // Colonne gauche — stats
  const leftX = 60;
  ctx.textAlign = "left";

  // Logo / titre
  ctx.fillStyle = "#fc4c02";
  ctx.font = "bold 22px system-ui";
  ctx.fillText("🐕 MushTrack", leftX, 55);

  ctx.fillStyle = "#aaa";
  ctx.font = "14px system-ui";
  ctx.fillText(dateStr, leftX, 80);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px system-ui";
  ctx.fillText(runType, leftX, 108);
  if (dogs) { ctx.fillStyle = "#fc4c02"; ctx.font = "13px system-ui"; ctx.fillText("🐾 " + dogs, leftX, 128); }

  // Grande stat km
  ctx.fillStyle = "#fc4c02";
  ctx.font = "bold 96px system-ui";
  ctx.fillText(km.toFixed(1), leftX, 240);
  ctx.fillStyle = "#aaa";
  ctx.font = "bold 28px system-ui";
  ctx.fillText("km", leftX + ctx.measureText(km.toFixed(1)).width + 8, 240);

  // Stats secondaires
  const stats = [
    { label: "Durée",   value: durStr },
    { label: "Vitesse", value: speed.toFixed(1) + " km/h" },
    { label: "Musher",  value: musher }
  ];
  let sy = 300;
  stats.forEach(s => {
    ctx.fillStyle = "#666";
    ctx.font = "13px system-ui";
    ctx.fillText(s.label.toUpperCase(), leftX, sy);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px system-ui";
    ctx.fillText(s.value, leftX, sy + 22);
    sy += 58;
  });

  // Bande orange bas
  ctx.fillStyle = "#fc4c02";
  ctx.fillRect(0, H-8, W, 8);

  // Watermark
  ctx.fillStyle = "#444";
  ctx.font = "12px system-ui";
  ctx.textAlign = "right";
  ctx.fillText("mushtrack.vercel.app", W - 20, H - 18);

  // Partage
  canvas.toBlob(async blob => {
    const file = new File([blob], "sortie-mushtrack.png", { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Sortie MushTrack — ${km.toFixed(1)} km`,
          text: `${runType} • ${km.toFixed(1)} km • ${durStr} • ${speed.toFixed(1)} km/h`,
          files: [file]
        });
      } catch(e) { if (e.name !== "AbortError") downloadShareImage(blob); }
    } else {
      downloadShareImage(blob);
    }
  }, "image/png");
}

function downloadShareImage(blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sortie-mushtrack-${new Date().toISOString().slice(0,10)}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function exportSeasonPDF() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert("PDF non disponible, réessaie dans un instant."); return; }

  const doc    = new jsPDF({ unit: "mm", format: "a4" });
  const orange = [252, 76, 2];
  const dark   = [30, 30, 30];
  const gray   = [120, 120, 120];
  const light  = [245, 245, 245];
  const W      = 210;
  let y        = 0;

  // En-tête
  doc.setFillColor(...orange);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont("helvetica", "bold");
  doc.text("MushTrack", 14, 13);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Rapport de saison", 14, 20);
  const dateStr = new Date().toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });
  doc.text(dateStr, W - 14, 20, { align: "right" });
  y = 36;

  // Musher
  doc.setTextColor(...dark);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(state.profile.name || "Musher", 14, y);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`${state.profile.region || ""}  ·  ${state.profile.disciplines || ""}  ·  ${state.profile.level || ""}`, 14, y + 5);
  y += 14;

  // Ligne séparatrice
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y); y += 8;

  // Cartes résumé (4 KPIs)
  const seasonKm = state.runs.reduce((s, r) => s + Number(r.km || 0), 0);
  const kpis = [
    ["Total km saison", `${Math.round(seasonKm)} km`],
    ["Sorties", `${state.runs.length}`],
    ["Attelage", `${state.dogs.length} chien${state.dogs.length !== 1 ? "s" : ""}`],
    ["Course objectif", state.raceName || state.raceType || "—"]
  ];
  const colW = (W - 28 - 9) / 4;
  kpis.forEach(([label, val], i) => {
    const x = 14 + i * (colW + 3);
    doc.setFillColor(...light);
    doc.roundedRect(x, y, colW, 20, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(label, x + colW / 2, y + 7, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark);
    doc.text(val, x + colW / 2, y + 15, { align: "center" });
  });
  y += 28;

  // Attelage
  if (state.dogs.length > 0) {
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...orange);
    doc.text("Attelage", 14, y); y += 6;
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    const dogCols = 3;
    state.dogs.forEach((dog, i) => {
      const col = i % dogCols;
      const row = Math.floor(i / dogCols);
      const x = 14 + col * 64;
      const dy = y + row * 10;
      doc.setFillColor(...light);
      doc.roundedRect(x, dy - 4, 60, 9, 1, 1, "F");
      doc.setFont("helvetica", "bold"); doc.text(dog.name, x + 3, dy + 1);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
      doc.text(`${dog.role}  ·  ${Math.round(dog.km || 0)} km`, x + 3, dy + 5);
      doc.setTextColor(...dark);
    });
    y += Math.ceil(state.dogs.length / dogCols) * 10 + 10;
  }

  // Historique sorties
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...orange);
  doc.text("Historique des sorties", 14, y); y += 6;

  const headers = ["Date", "Type", "Distance", "Récupération", "Météo"];
  const colWidths = [28, 38, 22, 36, 50];
  let x = 14;

  // En-tête tableau
  doc.setFillColor(...orange);
  doc.rect(14, y - 4, W - 28, 8, "F");
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 0.5);
    x += colWidths[i];
  });
  y += 6;

  // Lignes
  const runs = state.runs.slice(0, 30);
  runs.forEach((run, ri) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (ri % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(14, y - 3, W - 28, 7, "F"); }
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    x = 14;
    const row = [
      run.date ? new Date(run.date + "T12:00:00").toLocaleDateString("fr-FR") : "—",
      run.type || "—",
      `${Number(run.km || 0).toFixed(1)} km`,
      run.recovery || "—",
      run.weather || "—"
    ];
    row.forEach((cell, i) => {
      doc.text(String(cell).slice(0, 22), x + 2, y + 1.5);
      x += colWidths[i];
    });
    y += 7;
  });

  // Pied de page
  doc.setFontSize(7); doc.setTextColor(...gray);
  doc.text("Généré par MushTrack · mushtrack-beta-ready.vercel.app", W / 2, 290, { align: "center" });

  doc.save(`mushtrack-saison-${new Date().toISOString().slice(0, 10)}.pdf`);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Réseau social — fil d'activité ───────────────────────────────────────────
let feedPosts = [];
let feedLoading = false;
let lastSharedRun = null; // sortie en attente de partage

// Appelé depuis showScreen("community")
async function initCommunity() {
  showCommunityShareBanner();
  await fetchFeed();
}

// Affiche la bannière si une sortie vient d'être sauvegardée
function showCommunityShareBanner() {
  const run = state.runs[0];
  if (!run || !run.km) return;
  const banner  = document.getElementById("community-share-banner");
  const summary = document.getElementById("community-share-summary");
  if (!banner || !summary) return;
  const dogs = (run.team || []).map(id => { const d = state.dogs.find(dd => dd.id === id); return d ? d.name : ""; }).filter(Boolean);
  summary.textContent = `${Number(run.km).toFixed(1)} km · ${run.type || "Sortie"} · ${dogs.length ? dogs.join(", ") : "attelage"}`;
  lastSharedRun = run;
  banner.style.display = "block";
}

document.getElementById("community-share-dismiss")?.addEventListener("click", () => {
  document.getElementById("community-share-banner").style.display = "none";
  selectedPhotoFile = null;
  const preview = document.getElementById("community-photo-preview");
  if (preview) preview.style.display = "none";
});

// Aperçu photo en temps réel
let selectedPhotoFile = null;
document.getElementById("community-photo-input")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = document.getElementById("community-photo-img");
    const preview = document.getElementById("community-photo-preview");
    if (img && preview) {
      img.src = ev.target.result;
      preview.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
  const label = document.getElementById("community-photo-label");
  if (label) label.innerHTML = `&#x2705; Photo s&eacute;lectionn&eacute;e <input id="community-photo-input" type="file" accept="image/*" capture="environment" style="display:none"/>`;
  document.getElementById("community-photo-input")?.addEventListener("change", arguments.callee);
});

async function uploadFeedPhoto(file, deviceId) {
  const ext  = file.name.split(".").pop() || "jpg";
  const path = `${deviceId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from("mushtrack-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("mushtrack-photos").getPublicUrl(path);
  return urlData.publicUrl;
}

document.getElementById("community-share-btn")?.addEventListener("click", async () => {
  const btn = document.getElementById("community-share-btn");
  if (!lastSharedRun) return;
  btn.disabled = true;
  btn.textContent = "Partage en cours…";

  const dogs = (lastSharedRun.team || [])
    .map(id => { const d = state.dogs.find(dd => dd.id === id); return d ? d.name : ""; })
    .filter(Boolean);

  let photoUrl = "";
  try {
    if (selectedPhotoFile) {
      btn.textContent = "Upload photo…";
      photoUrl = await uploadFeedPhoto(selectedPhotoFile, state.deviceId);
    }

    const res = await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId:  state.deviceId,
        userName:  state.profile.name || "Musher",
        region:    state.profile.region || "",
        level:     state.profile.level || "",
        km:        lastSharedRun.km,
        duration:  lastSharedRun.duration || 0,
        type:      lastSharedRun.type || "",
        dogNames:  dogs.join(", "),
        dogCount:  dogs.length,
        notes:     lastSharedRun.notes || "",
        photoUrl
      })
    });
    const data = await res.json();
    if (data.configured === false) {
      btn.textContent = "⚠️ Réseau non disponible";
      return;
    }
    selectedPhotoFile = null;
    document.getElementById("community-share-banner").style.display = "none";
    await fetchFeed();
  } catch (e) {
    btn.textContent = "❌ Erreur";
    console.error(e);
  } finally {
    btn.disabled = false;
  }
});

async function fetchFeed() {
  if (feedLoading) return;
  feedLoading = true;
  const feedEl  = document.getElementById("community-feed");
  const statusEl = document.getElementById("community-feed-status");
  if (!feedEl) { feedLoading = false; return; }

  try {
    const res  = await fetch("/api/feed");
    const data = await res.json();

    if (!data.configured) {
      feedEl.innerHTML = `<p style="color:#aaa;text-align:center;padding:40px 0;font-size:0.85rem">Réseau non encore configuré.<br>Exécute <code>supabase/feed.sql</code> dans Supabase.</p>`;
      feedLoading = false; return;
    }

    feedPosts = data.posts || [];
    if (statusEl) { statusEl.style.display = "block"; statusEl.textContent = `${feedPosts.length} activité${feedPosts.length !== 1 ? "s" : ""}`; }
    renderFeed();
  } catch (e) {
    if (feedEl) feedEl.innerHTML = `<p style="color:#d94040;text-align:center;padding:20px 0;font-size:0.85rem">Erreur de chargement</p>`;
  } finally {
    feedLoading = false;
  }
}

function renderFeed() {
  const feedEl = document.getElementById("community-feed");
  if (!feedEl) return;

  if (!feedPosts.length) {
    feedEl.innerHTML = `<p style="color:#aaa;text-align:center;padding:60px 0;font-size:0.85rem">Aucune activité partagée pour l'instant.<br>Sois le premier ! 🐕</p>`;
    return;
  }

  feedEl.innerHTML = feedPosts.map(post => {
    const isMe      = post.device_id === state.deviceId;
    const reactions = post.reactions || [];
    const myReact   = reactions.includes(state.deviceId);
    const initials  = (post.user_name || "M").slice(0, 2).toUpperCase();
    const mins      = post.duration ? Math.round(post.duration / 60) : null;
    const pace      = (post.km && post.duration) ? (post.duration / 60 / post.km).toFixed(1) : null;
    const timeAgo   = formatTimeAgo(post.created_at);

    return `
    <div class="feed-card" data-post-id="${post.id}">
      <div class="feed-header">
        <div class="feed-avatar">${initials}</div>
        <div class="feed-user">
          <strong>${post.user_name || "Musher"}</strong>
          <small>${post.region ? post.region + " · " : ""}${timeAgo}</small>
        </div>
        ${isMe ? `<button class="feed-delete-btn" data-delete-post="${post.id}" title="Supprimer">✕</button>` : ""}
      </div>

      <div class="feed-stats">
        <div class="feed-stat"><span>${Number(post.km || 0).toFixed(1)}</span><small>km</small></div>
        ${mins ? `<div class="feed-stat"><span>${mins}</span><small>min</small></div>` : ""}
        ${pace ? `<div class="feed-stat"><span>${pace}</span><small>min/km</small></div>` : ""}
        ${post.dog_count ? `<div class="feed-stat"><span>${post.dog_count}</span><small>chien${post.dog_count > 1 ? "s" : ""}</small></div>` : ""}
      </div>

      ${post.photo_url ? `<div class="feed-photo"><img src="${post.photo_url}" alt="Photo sortie" loading="lazy"/></div>` : ""}
      ${post.dog_names ? `<p class="feed-dogs">🐾 ${post.dog_names}</p>` : ""}
      ${post.type ? `<span class="feed-type">${post.type}</span>` : ""}
      ${post.notes ? `<p class="feed-notes">"${post.notes}"</p>` : ""}

      <div class="feed-actions">
        <button class="feed-react-btn ${myReact ? "reacted" : ""}" data-react-post="${post.id}" data-reacted="${myReact}">
          🐕 <span>${reactions.length || ""}</span>
        </button>
        <button class="feed-comment-btn" data-comment-post="${post.id}">
          💬 <span>${post.comment_count || ""}</span>
        </button>
      </div>
      <div class="feed-comments-section" id="comments-${post.id}" style="display:none"></div>
    </div>`;
  }).join("");

  // Réactions
  feedEl.querySelectorAll("[data-react-post]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const postId  = btn.dataset.reactPost;
      const reacted = btn.dataset.reacted === "true";
      btn.dataset.reacted = !reacted;
      btn.classList.toggle("reacted", !reacted);
      const countEl = btn.querySelector("span");
      const post    = feedPosts.find(p => p.id === postId);
      if (!post) return;
      if (!reacted) post.reactions.push(state.deviceId);
      else post.reactions = post.reactions.filter(d => d !== state.deviceId);
      if (countEl) countEl.textContent = post.reactions.length || "";
      await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "react", postId, deviceId: state.deviceId, active: !reacted })
      }).catch(() => {});
    });
  });

  // Commentaires — toggle
  feedEl.querySelectorAll("[data-comment-post]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const postId  = btn.dataset.commentPost;
      const section = document.getElementById(`comments-${postId}`);
      if (!section) return;
      if (section.style.display === "none") {
        section.style.display = "block";
        await loadComments(postId, section, btn);
      } else {
        section.style.display = "none";
      }
    });
  });

  // Suppression post
  feedEl.querySelectorAll("[data-delete-post]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer cette activité ?")) return;
      const id = btn.dataset.deletePost;
      await fetch(`/api/feed?id=${id}&deviceId=${encodeURIComponent(state.deviceId)}`, { method: "DELETE" }).catch(() => {});
      feedPosts = feedPosts.filter(p => p.id !== id);
      renderFeed();
    });
  });
}

async function loadComments(postId, section, toggleBtn) {
  section.innerHTML = `<p class="feed-comment-loading">Chargement…</p>`;
  try {
    const res  = await fetch(`/api/feed?comments=${postId}`);
    const data = await res.json();
    const comments = data.comments || [];

    const html = comments.map(c => {
      const isMe = c.device_id === state.deviceId;
      return `<div class="feed-comment" data-cid="${c.id}">
        <strong>${c.user_name}</strong>
        <span>${c.text}</span>
        <small>${formatTimeAgo(c.created_at)}</small>
        ${isMe ? `<button class="feed-comment-delete" data-delete-comment="${c.id}">✕</button>` : ""}
      </div>`;
    }).join("") || `<p class="feed-comment-empty">Aucun commentaire. Sois le premier !</p>`;

    section.innerHTML = `
      <div class="feed-comments-list">${html}</div>
      <div class="feed-comment-form">
        <input class="feed-comment-input" type="text" placeholder="Ajouter un commentaire…" maxlength="500"/>
        <button class="feed-comment-send">Envoyer</button>
      </div>`;

    // Envoyer commentaire
    const input  = section.querySelector(".feed-comment-input");
    const sendBtn = section.querySelector(".feed-comment-send");
    sendBtn.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;
      sendBtn.disabled = true;
      const res2 = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "comment", postId, deviceId: state.deviceId, userName: state.profile.name || "Musher", text })
      }).catch(() => null);
      if (res2 && res2.ok) {
        input.value = "";
        const post = feedPosts.find(p => p.id === postId);
        if (post) { post.comment_count = (post.comment_count || 0) + 1; if (toggleBtn) { const sp = toggleBtn.querySelector("span"); if (sp) sp.textContent = post.comment_count; } }
        await loadComments(postId, section, toggleBtn);
      }
      sendBtn.disabled = false;
    });
    input.addEventListener("keydown", e => { if (e.key === "Enter") sendBtn.click(); });

    // Supprimer commentaire
    section.querySelectorAll("[data-delete-comment]").forEach(b => {
      b.addEventListener("click", async () => {
        const cid = b.dataset.deleteComment;
        await fetch("/api/feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "delete-comment", commentId: cid, deviceId: state.deviceId })
        }).catch(() => {});
        const post = feedPosts.find(p => p.id === postId);
        if (post && post.comment_count > 0) { post.comment_count--; if (toggleBtn) { const sp = toggleBtn.querySelector("span"); if (sp) sp.textContent = post.comment_count || ""; } }
        await loadComments(postId, section, toggleBtn);
      });
    });
  } catch (e) {
    section.innerHTML = `<p class="feed-comment-empty">Erreur de chargement</p>`;
  }
}

function formatTimeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)   return "à l'instant";
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.round(diff / 3600)} h`;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

document.getElementById("community-refresh-btn")?.addEventListener("click", () => {
  const activeTab = document.querySelector(".community-tab.active")?.dataset.tab || "feed";
  if (activeTab === "feed") fetchFeed();
  else if (activeTab === "challenges") renderChallenge();
  else if (activeTab === "clubs") renderMyClubs();
});

// ── Onglets communauté ────────────────────────────────────────────────────────
document.querySelectorAll(".community-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".community-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const t = tab.dataset.tab;
    document.getElementById("community-tab-feed").style.display       = t === "feed"       ? "block" : "none";
    document.getElementById("community-tab-challenges").style.display = t === "challenges" ? "block" : "none";
    document.getElementById("community-tab-clubs").style.display      = t === "clubs"      ? "block" : "none";
    if (t === "challenges") renderChallenge();
    if (t === "clubs")      renderMyClubs();
    if (t === "map")        initMushersMap();
  });
});

// ── Défis hebdomadaires ───────────────────────────────────────────────────────
async function renderChallenge() {
  const el = document.getElementById("challenge-card");
  if (!el) return;
  el.innerHTML = `<p style="color:#aaa;text-align:center;padding:30px 0;font-size:0.85rem">Chargement…</p>`;
  try {
    const res  = await fetch("/api/challenges");
    const data = await res.json();
    if (!data.configured) { el.innerHTML = `<p style="color:#aaa;text-align:center;padding:30px 0;font-size:0.85rem">Défis non configurés.<br>Exécute <code>supabase/challenges_clubs.sql</code></p>`; return; }
    if (!data.challenge)  { el.innerHTML = `<p style="color:#aaa;text-align:center;padding:30px 0;font-size:0.85rem">Aucun défi actif cette semaine.</p>`; return; }

    const ch      = data.challenge;
    const entries = data.entries || [];
    const myEntry = entries.find(e => e.device_id === state.deviceId);
    const myKm    = myEntry ? Number(myEntry.km) : 0;
    const target  = Number(ch.target_km);
    const pct     = Math.min(100, Math.round((myKm / target) * 100));
    const weekKm  = Number(getWeekKm ? getWeekKm() : 0);

    el.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-header">
          <span class="challenge-badge">🏆 Défi de la semaine</span>
          <small>${new Date(ch.week_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${new Date(ch.week_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</small>
        </div>
        <h3 class="challenge-title">${ch.title}</h3>
        ${ch.description ? `<p class="challenge-desc">${ch.description}</p>` : ""}
        <div class="challenge-progress-bar"><div class="challenge-progress-fill" style="width:${pct}%"></div></div>
        <div class="challenge-progress-label">
          <span>${myKm.toFixed(1)} km</span>
          <span>${pct}%</span>
          <span>${target} km</span>
        </div>
        <button id="challenge-join-btn" class="challenge-join" ${myEntry ? "disabled" : ""}>
          ${myEntry ? "✓ Participant·e" : "Rejoindre le défi"}
        </button>
        <div class="challenge-leaderboard">
          <p class="challenge-lb-title">Classement</p>
          ${entries.slice(0, 10).map((e, i) => `
            <div class="challenge-lb-row ${e.device_id === state.deviceId ? "me" : ""}">
              <span class="lb-rank">${i + 1}</span>
              <span class="lb-name">${e.user_name}</span>
              <span class="lb-km">${Number(e.km).toFixed(1)} km</span>
            </div>`).join("") || `<p style="color:#666;font-size:0.78rem;text-align:center;padding:8px 0">Aucun participant pour l'instant</p>`}
        </div>
      </div>`;

    document.getElementById("challenge-join-btn")?.addEventListener("click", async () => {
      const btn = document.getElementById("challenge-join-btn");
      btn.disabled = true;
      btn.textContent = "Inscription…";
      await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: ch.id, deviceId: state.deviceId, userName: state.profile.name || "Musher", km: weekKm })
      }).catch(() => {});
      await renderChallenge();
    });
  } catch (e) {
    el.innerHTML = `<p style="color:#d94040;text-align:center;padding:20px 0">Erreur de chargement</p>`;
  }
}

// ── Clubs ─────────────────────────────────────────────────────────────────────
let myClubs = [];

async function renderMyClubs() {
  const el = document.getElementById("clubs-my-list");
  if (!el) return;
  el.innerHTML = "";
  try {
    const res  = await fetch(`/api/clubs?deviceId=${encodeURIComponent(state.deviceId)}`);
    const data = await res.json();
    if (!data.configured) { el.innerHTML = `<p style="color:#aaa;font-size:0.82rem;text-align:center;padding:16px 0">Clubs non configurés.<br>Exécute <code>supabase/challenges_clubs.sql</code></p>`; return; }
    myClubs = data.clubs || [];
    if (!myClubs.length) { el.innerHTML = `<p style="color:#aaa;font-size:0.82rem;text-align:center;padding:16px 0">Tu n'es dans aucun club.<br>Crée-en un ou rejoins-en un avec un code.</p>`; return; }
    el.innerHTML = myClubs.map(club => `
      <div class="club-card">
        <div class="club-header">
          <div>
            <strong>${club.name}</strong>
            <small>${club.members.length} membre${club.members.length > 1 ? "s" : ""}</small>
          </div>
          <span class="club-code">${club.code}</span>
        </div>
        ${club.description ? `<p class="club-desc">${club.description}</p>` : ""}
        <div class="club-members">
          ${club.members.map(m => `<span class="club-member-chip ${m.device_id === state.deviceId ? "me" : ""}">${m.user_name}</span>`).join("")}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <button class="club-leave-btn" data-leave-club="${club.id}">Quitter</button>
        </div>
      </div>`).join("");

    el.querySelectorAll("[data-leave-club]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Quitter ce club ?")) return;
        await fetch(`/api/clubs?clubId=${btn.dataset.leaveClub}&deviceId=${encodeURIComponent(state.deviceId)}`, { method: "DELETE" }).catch(() => {});
        await renderMyClubs();
      });
    });
  } catch (e) {
    el.innerHTML = `<p style="color:#d94040;font-size:0.82rem;text-align:center;padding:16px 0">Erreur de chargement</p>`;
  }
}

// Créer un club
document.getElementById("clubs-create-btn")?.addEventListener("click", () => {
  const modal = document.getElementById("clubs-create-modal");
  if (modal) modal.style.display = modal.style.display === "none" ? "block" : "none";
});
document.getElementById("clubs-create-cancel")?.addEventListener("click", () => {
  document.getElementById("clubs-create-modal").style.display = "none";
});
document.getElementById("clubs-create-confirm")?.addEventListener("click", async () => {
  const name = document.getElementById("clubs-create-name")?.value.trim();
  const desc = document.getElementById("clubs-create-desc")?.value.trim();
  if (!name) return;
  const btn = document.getElementById("clubs-create-confirm");
  btn.disabled = true;
  const res  = await fetch("/api/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", deviceId: state.deviceId, userName: state.profile.name || "Musher", name, description: desc }) }).catch(() => null);
  const data = res ? await res.json() : null;
  btn.disabled = false;
  if (data?.club) {
    document.getElementById("clubs-create-modal").style.display = "none";
    document.getElementById("clubs-create-name").value = "";
    document.getElementById("clubs-create-desc").value = "";
    await renderMyClubs();
  }
});

// Rejoindre un club
document.getElementById("clubs-join-btn")?.addEventListener("click", async () => {
  const code  = document.getElementById("clubs-join-input")?.value.trim().toUpperCase();
  const msgEl = document.getElementById("clubs-join-msg");
  if (!code || code.length !== 6) { if (msgEl) { msgEl.textContent = "Code à 6 caractères requis"; msgEl.style.color = "#d94040"; msgEl.style.display = "block"; } return; }
  const btn = document.getElementById("clubs-join-btn");
  btn.disabled = true;
  const res  = await fetch("/api/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", deviceId: state.deviceId, userName: state.profile.name || "Musher", code }) }).catch(() => null);
  const data = res ? await res.json() : null;
  btn.disabled = false;
  if (data?.club) {
    if (msgEl) { msgEl.textContent = `✓ Bienvenue dans ${data.club.name} !`; msgEl.style.color = "#4caf50"; msgEl.style.display = "block"; }
    document.getElementById("clubs-join-input").value = "";
    await renderMyClubs();
  } else {
    if (msgEl) { msgEl.textContent = data?.error || "Code invalide"; msgEl.style.color = "#d94040"; msgEl.style.display = "block"; }
  }
});

// ── Carte des mushers ─────────────────────────────────────────────────────────
let musherMap = null;

async function initMushersMap() {
  // Opt-in toggle : état sauvegardé en localStorage
  const toggle = document.getElementById("map-optin-toggle");
  if (toggle) {
    toggle.checked = localStorage.getItem("mushtrack-map-optin") === "true";
    toggle.addEventListener("change", async () => {
      if (toggle.checked) {
        localStorage.setItem("mushtrack-map-optin", "true");
        navigator.geolocation?.getCurrentPosition(async pos => {
          await fetch("/api/map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId: state.deviceId,
              userName: state.profile?.name || "Musher",
              region:   state.profile?.region || "",
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            })
          }).catch(() => {});
          loadMapMarkers();
        }, () => { toggle.checked = false; localStorage.removeItem("mushtrack-map-optin"); });
      } else {
        localStorage.removeItem("mushtrack-map-optin");
        await fetch(`/api/map?deviceId=${encodeURIComponent(state.deviceId)}`, { method: "DELETE" }).catch(() => {});
        loadMapMarkers();
      }
    });
  }

  // Initialiser Leaflet une seule fois
  const mapEl = document.getElementById("mushers-map");
  if (!mapEl) return;
  if (!musherMap) {
    if (typeof L === "undefined") return;
    musherMap = L.map("mushers-map", { zoomControl: true, attributionControl: false }).setView([46.5, 2.5], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd"
    }).addTo(musherMap);
  } else {
    musherMap.invalidateSize();
  }
  loadMapMarkers();
}

async function loadMapMarkers() {
  if (!musherMap) return;
  musherMap.eachLayer(l => { if (l instanceof L.Marker || l instanceof L.CircleMarker) musherMap.removeLayer(l); });

  try {
    const res  = await fetch("/api/map");
    const data = await res.json();
    if (!data.configured || !data.mushers?.length) return;

    // Grouper les mushers au même point arrondi
    const groups = {};
    for (const m of data.mushers) {
      const key = `${m.lat},${m.lon}`;
      groups[key] = groups[key] || { lat: m.lat, lon: m.lon, names: [] };
      groups[key].names.push(m.user_name);
    }

    for (const g of Object.values(groups)) {
      const isMe = data.mushers.some(m => m.lat === g.lat && m.lon === g.lon && m.user_name === (state.profile?.name || "Musher"));
      const marker = L.circleMarker([g.lat, g.lon], {
        radius: g.names.length > 1 ? 10 : 7,
        fillColor: isMe ? "#fc4c02" : "#60a5fa",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(musherMap);
      marker.bindPopup(`<strong>${g.names.join(", ")}</strong><br><small>${g.names.length} musher${g.names.length > 1 ? "s" : ""} dans cette zone</small>`);
    }
  } catch (e) {}
}

// ── Push Notifications ────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZkOqp0nOFuUzIjbCzxO5_8IhFk";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!("PushManager" in window)) return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userId: currentUser?.id || null
      })
    });

    console.log("Push notifications activées ✅");
  } catch (err) {
    console.warn("Push subscribe error:", err);
  }
}

// Demande la permission après 10 secondes (laisser l'app charger)
setTimeout(() => {
  if (Notification.permission === "default") {
    subscribeToPush();
  } else if (Notification.permission === "granted") {
    subscribeToPush();
  }
}, 10000);

// Initialisation au démarrage
checkReminders();
fetchLeaderboard();
applyLang();
syncLocalInterestsToServer();

// Renvoie à Supabase tous les intérêts locaux qui auraient été perdus (bug env vars)
async function syncLocalInterestsToServer() {
  const interests = state.raceInterests || {};
  const ids = Object.keys(interests);
  if (!ids.length) return;
  for (const id of ids) {
    const entry = interests[id];
    try {
      await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceId: id,
          raceName: entry.raceName || id,
          deviceId: state.deviceId,
          interested: true,
          status: entry.status || "interesse",
          profile: state.profile
        })
      });
    } catch (_) {}
  }
}

// Boutons de langue
document.querySelectorAll(".lang-btn[data-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.lang = btn.dataset.lang;
    saveState();
    // Mettre à jour le style actif
    document.querySelectorAll(".lang-btn").forEach(b => {
      const active = b.dataset.lang === state.lang;
      b.style.borderColor = active ? "#fc4c02" : "#ddd";
      b.style.background   = active ? "#fff4f0" : "#fff";
      b.style.color        = active ? "#fc4c02" : "#555";
    });
    applyLang();
  });
});

// Appliquer le style actif au chargement
function updateLangButtons() {
  document.querySelectorAll(".lang-btn").forEach(b => {
    const active = b.dataset.lang === (state.lang || "fr");
    b.style.borderColor = active ? "#fc4c02" : "#ddd";
    b.style.background   = active ? "#fff4f0" : "#fff";
    b.style.color        = active ? "#fc4c02" : "#555";
  });
}
updateLangButtons();

// Boutons d'unités km / miles
function kmToMi(km) { return km * 0.621371; }
function miToKm(mi) { return mi / 0.621371; }
function displayDist(km) {
  if ((state.unit || "km") === "mi") return kmToMi(km).toFixed(1) + " mi";
  return Number(km).toFixed(1) + " km";
}

document.querySelectorAll(".unit-btn[data-unit]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.unit = btn.dataset.unit;
    saveState();
    updateUnitButtons();
    render();
  });
});

function updateUnitButtons() {
  document.querySelectorAll(".unit-btn").forEach(b => {
    const active = b.dataset.unit === (state.unit || "km");
    b.style.borderColor = active ? "#fc4c02" : "#ddd";
    b.style.background  = active ? "#fff4f0" : "#fff";
    b.style.color       = active ? "#fc4c02" : "#555";
  });
}
updateUnitButtons();

// Ferme les actions chien si on clique ailleurs
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dog-card")) {
    document.querySelectorAll(".dog-card.show-actions").forEach(c => c.classList.remove("show-actions"));
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Contact d'urgence + SOS ───────────────────────────────────────────────────
function renderEmergencyContact() {
  const el = document.getElementById("emergency-contact-section");
  if (!el) return;
  const c = state.emergencyContact || { name: "", phone: "" };
  el.innerHTML = `
    <section class="section-heading spaced" style="margin-top:20px">
      <h2>Contact d'urgence</h2>
      <span>SOS terrain</span>
    </section>
    <div style="background:#fff5f0;border-radius:14px;padding:16px;border:1.5px solid #fca5a5;margin-bottom:20px">
      <p style="font-size:0.82rem;color:#555;margin-bottom:12px">En cas de SOS sur le terrain, un appel est passé directement à ce contact.</p>
      <label style="display:block;margin-bottom:10px;font-size:0.85rem;font-weight:600;color:#333">
        Nom
        <input id="ec-name" type="text" placeholder="Ex: Marie Dupont" value="${c.name || ""}"
          style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.9rem;background:#fff"/>
      </label>
      <label style="display:block;margin-bottom:12px;font-size:0.85rem;font-weight:600;color:#333">
        Téléphone
        <input id="ec-phone" type="tel" placeholder="Ex: +41791234567" value="${c.phone || ""}"
          style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.9rem;background:#fff"/>
      </label>
      <button id="ec-save-btn" type="button"
        style="width:100%;padding:11px;background:#fc4c02;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.9rem;cursor:pointer">
        Enregistrer le contact
      </button>
      <div id="ec-saved-msg" style="display:none;font-size:0.8rem;text-align:center;margin-top:8px;color:#16a34a;font-weight:600">✅ Contact enregistré</div>
    </div>`;

  document.getElementById("ec-save-btn").addEventListener("click", () => {
    state.emergencyContact = {
      name:  document.getElementById("ec-name").value.trim(),
      phone: document.getElementById("ec-phone").value.trim()
    };
    saveState();
    const msg = document.getElementById("ec-saved-msg");
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 2500);
  });
}

function triggerSOS() {
  const c = state.emergencyContact || {};
  if (c.phone) {
    window.location.href = `tel:${c.phone}`;
  } else {
    alert("Aucun contact d’urgence configuré.\nVa dans Paramètres > Contact d’urgence.");
  }
}

renderEmergencyContact();
// ─────────────────────────────────────────────────────────────────────────────

// ── Suivi GPS en direct ───────────────────────────────────────────────────────
let _liveToken = null;
let _liveInterval = null;
let _liveWatchId = null;

function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

function startLiveTracking() {
  if (_liveToken) return;
  _liveToken = generateUUID();

  const liveBar = document.getElementById("live-tracking-bar");
  if (liveBar) liveBar.style.display = "flex";

  _liveWatchId = navigator.geolocation?.watchPosition(pos => {
    fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: _liveToken,
        device_id: state.deviceId,
        user_name: state.profile?.name || "Musher",
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      })
    }).catch(() => {});
  }, null, { enableHighAccuracy: true, maximumAge: 5000 });
}

async function stopLiveTracking() {
  if (!_liveToken) return;
  if (_liveWatchId != null) navigator.geolocation?.clearWatch(_liveWatchId);
  await fetch(`/api/live?token=${_liveToken}`, { method: "DELETE" }).catch(() => {});
  _liveToken = null;
  _liveWatchId = null;
  const liveBar = document.getElementById("live-tracking-bar");
  if (liveBar) liveBar.style.display = "none";
}

function shareLiveLink() {
  if (!_liveToken) return;
  const url = `${location.origin}/track?token=${_liveToken}`;
  if (navigator.share) {
    navigator.share({ title: "MushTrack — Suivi en direct", url });
  } else {
    navigator.clipboard?.writeText(url).then(() => alert("Lien copié !"));
  }
}

document.getElementById("live-share-btn")?.addEventListener("click", shareLiveLink);
document.getElementById("live-stop-btn")?.addEventListener("click", stopLiveTracking);
// ─────────────────────────────────────────────────────────────────────────────
