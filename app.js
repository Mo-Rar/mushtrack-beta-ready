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

document.getElementById("auth-toggle-btn")?.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  const isSignup = authMode === "signup";
  document.getElementById("auth-submit").textContent = isSignup ? "Créer le compte" : "Se connecter";
  document.getElementById("auth-toggle-text").textContent = isSignup ? "Déjà un compte ?" : "Pas encore de compte ?";
  document.getElementById("auth-toggle-btn").textContent = isSignup ? "Se connecter" : "Créer un compte";
  document.getElementById("auth-password").autocomplete = isSignup ? "new-password" : "current-password";
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
      result = await supabase.auth.signUp({ email, password });
      if (!result.error && result.data?.user && !result.data.session) {
        setAuthError("Vérifiez votre email pour confirmer votre compte.");
        btn.disabled = false;
        btn.textContent = "Créer le compte";
        return;
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

function onAuthSuccess(user) {
  currentUser = user;
  // Synchronise le deviceId avec l'ID Supabase pour la communauté
  state.deviceId = user.id;
  saveState();
  hideAuthOverlay();
  addUserBar(user.email);
  // Réaffiche le panel admin maintenant qu'on connaît l'utilisateur
  renderAdminPanel();
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
  }
];

const defaultState = {
  goalKm: 1000,
  goalDate: "2027-01-01",
  seasonMode: "winter",
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
  agenda: [],
  missingRaceReports: [],
  dogs: [],
  selectedDogIds: [],
  runs: [],
  planWeather: null,
  planWeatherUpdatedAt: null
};

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
    return normalizeState({ ...structuredClone(defaultState), ...JSON.parse(saved) });
  } catch {
    return structuredClone(defaultState);
  }
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
  value.openRunJoins ||= {};
  value.seasonMode ||= "winter";
  value.agenda ||= structuredClone(defaultState.agenda);
  value.missingRaceReports ||= [];
  value.planWeather ||= null;
  value.planWeatherUpdatedAt ||= null;
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

  if (id === "plan") {
    updatePlanWeatherIfNeeded();
  }

  if (id === "race") {
    fetchRaceRadar();
  }

  if (id === "agenda") {
    fetchOpenRuns();
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

function render() {
  const seasonKm = getSeasonKm();
  const remainingKm = Math.max(0, state.goalKm - seasonKm);
  const weeksLeft = Math.max(1, Math.ceil(daysUntilGoal() / 7));
  const weeklyNeed = Math.ceil(remainingKm / weeksLeft);
  const progress = Math.min(100, Math.round((seasonKm / state.goalKm) * 100));

  bindText("seasonKm", Math.round(seasonKm));
  bindText("goalKm", state.goalKm);
  bindText("goalMessage", `${remainingKm.toFixed(0)} km restants, environ ${weeklyNeed} km par semaine.`);
  bindText("weekKm", getWeekKm().toFixed(1));
  bindText("avgSpeed", getAvgSpeed().toFixed(1));
  bindText("runCount", state.runs.length);
  bindText("dogCount", state.dogs.length);
  bindText("raceType", state.raceType);
  bindText("raceKm", state.raceKm);
  bindText("selectedCount", `${state.selectedDogIds.length} selectionnes`);
  bindText("coachTitle", getCoachInsight().title);
  bindText("coachText", getCoachInsight().text);
  bindText("raceReadiness", getRaceReadiness());

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
}

function bindText(name, value) {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((node) => {
    node.textContent = value;
  });
}

function attachLongPress(element, callback) {
  let pressTimer = null;
  const start = (event) => {
    if (event.target.closest("button")) return;
    pressTimer = setTimeout(() => callback(event), 550);
  };
  const cancel = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    callback(event);
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
    return `
    <article class="dog-card ${readiness.level}" data-open-dog="${dog.id}">
      <div>
        <b>${dog.name}</b>
        <span>${dog.role} - ${getDogAge(dog)} ans - ${dog.weight} kg - ${readiness.title}</span>
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
    attachLongPress(card, () => card.classList.toggle("show-actions"));
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

function renderDogProfile() {
  const list = document.querySelector('[data-list="dogProfile"]');
  if (!list) return;
  const dog = state.dogs.find((item) => item.id === activeDogId) || state.dogs[0];
  if (!dog) return;
  activeDogId = dog.id;
  bindText("detailDogName", dog.name);
  const runs = state.runs.filter((run) => run.team.includes(dog.id));
  const lastRun = runs[0];
  const recentKm = getDogRecentKm(dog.id);
  const avgEnergy = runs.length ? runs.reduce((sum, run) => sum + Number(run.energy || 4), 0) / runs.length : 0;
  const health = getDogHealthSignal(dog, runs, recentKm, avgEnergy);
  const readiness = getDogReadiness(dog);
  const lastRecovery = lastRun ? lastRun.recovery : "Aucune sortie";
  const pawStatus = lastRun ? (lastRun.paws ? "OK" : "A verifier") : "Non note";
  const hydrationStatus = lastRun ? (lastRun.hydrated ? "OK" : "A renforcer") : "Non note";
  const recentNotes = runs
    .filter((run) => run.notes)
    .slice(0, 2)
    .map((run) => `${formatDate(run.date)} : ${run.notes}`)
    .join("<br>") || "Aucune note recente.";

  list.innerHTML = `
    <article class="profile-hero">
      <span>${dog.role}</span>
      <strong>${Math.round(dog.km)} km saison</strong>
      <p>${dog.note || "Aucune note pour ce chien."}</p>
    </article>
    <section class="profile-grid">
      <article><span>Naissance</span><b>${formatDogBirthdate(dog.birthdate)}</b></article>
      <article><span>Age calcule</span><b>${getDogAge(dog)} ans</b></article>
      <article><span>Poids</span><b>${dog.weight} kg</b></article>
      <article><span>7 jours</span><b>${recentKm.toFixed(1)} km</b></article>
      <article><span>Energie moy.</span><b>${avgEnergy ? avgEnergy.toFixed(1) : "-"}/5</b></article>
      <article><span>Recuperation</span><b>${lastRecovery}</b></article>
      <article><span>Harnais</span><b>${dog.harness || "A noter"}</b></article>
      <article><span>Statut</span><b>${readiness.title}</b></article>
    </section>
    <section class="dog-health-grid">
      <article class="dog-health ${health.level}">
        <span>Etat du jour</span>
        <b>${health.title}</b>
        <p>${health.text}</p>
      </article>
      <article>
        <span>Carnet sante</span>
        <b>Pattes ${pawStatus} - Hydratation ${hydrationStatus}</b>
        <p>${recentNotes}</p>
      </article>
      <article class="${dog.limitation ? "danger" : ""}">
        <span>Point de vigilance</span>
        <b>${dog.limitation || "Rien de particulier"}</b>
        <p>${dog.vet ? `Suivi veto : ${dog.vet}` : "Ajoute ici les infos veto, blessures, sensibilites ou repos impose."}</p>
      </article>
    </section>
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
            <span>${formatDate(run.date)} - ${run.recovery} - energie ${run.energy}/5</span>
          </div>
          <strong>${Number(run.km).toFixed(1)} km</strong>
        </article>
      `).join("") || `<p class="empty-state">Pas encore de sortie pour ${dog.name}.</p>`}
    </section>
  `;
}

function renderDogPicker() {
  const list = document.querySelector('[data-list="dogPicker"]');
  if (!list) return;

  list.innerHTML = state.dogs.map((dog) => {
    const selected = state.selectedDogIds.includes(dog.id);
    return `<button class="${selected ? "selected" : ""}" data-dog-id="${dog.id}">${dog.name}</button>`;
  }).join("");

  list.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => toggleDogSelection(button.dataset.dogId));
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
    : `<p class="empty-state">Aucun chien selectionne.</p>`;
}

function renderTeamSlots() {
  document.querySelectorAll("[data-team-slot]").forEach((slot) => {
    const role = slot.dataset.teamSlot;
    const dogs = state.dogs.filter((dog) => state.selectedDogIds.includes(dog.id) && dog.role === role);
    slot.innerHTML = `<div class="slot-row">${dogs.map((dog) => `<span class="chip">${dog.name}</span>`).join("") || `<span class="chip">Vide</span>`}</div>`;
  });
}

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
      attachLongPress(card, () => card.classList.toggle("show-actions"));
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
    .map((point) => Array.isArray(point) ? point : [point.lat, point.lng])
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
  }
];

function renderWebAdvice() {
  const list = document.querySelector('[data-list="webAdvice"]');
  if (!list) return;

  // Calcul de la "période" : change tous les 2 jours
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const periodIndex = Math.floor(daysSinceEpoch / 2);
  const total = ADVICE_BANK.length;

  // 2 conseils différents tirés de la banque selon la période
  const idx1 = periodIndex % total;
  const idx2 = (periodIndex + 1) % total;
  const todayTips = [ADVICE_BANK[idx1], ADVICE_BANK[idx2]];

  // Calcul du prochain changement (combien de jours restants)
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

function renderPlan() {
  const list = document.querySelector('[data-list="planWeeks"]');
  if (!list) return;

  list.innerHTML = buildPlan().map((week) => `
    <article class="${week.level || ""}">
      <span>${week.label}</span>
      <b>${week.km} km</b>
      <small>${week.focus}</small>
    </article>
  `).join("");

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
  const first = buildPlan()[0];
  return {
    title: first.focus.split(",")[0],
    text: `${first.km} km cette semaine. ${first.focus}`
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
    <article class="plan-signal ${weekActions.level}">
      <span>Cette semaine</span>
      <b>${weekActions.title}</b>
      <small>${weekActions.text}</small>
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

function getDogRecentKm(id) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return state.runs
    .filter((run) => new Date(`${run.date}T12:00:00`) >= cutoff && run.team.includes(id))
    .reduce((sum, run) => sum + Number(run.km), 0);
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

function renderRaceSearch() {
  const list = document.querySelector('[data-list="raceSearchResults"]');
  if (!list) return;

  const region = document.querySelector("#race-search-region")?.value.trim().toLowerCase() || "";
  const type = document.querySelector("#race-search-type")?.value || "";
  const distance = document.querySelector("#race-search-distance")?.value || "";
  const surface = document.querySelector("#race-search-surface")?.value || "";
  const reliability = document.querySelector("#race-search-reliability")?.value || "";
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
    notes: report.notes || "Course signalee manuellement dans MushTrack."
  }));
  // Filtrer les courses remote : seulement approved ou sans status (catalogue officiel)
  const approvedRemote = remoteRaceCatalog.filter((r) => !r.status || r.status === "approved");
  const mergedRaces = mergeRaceSources([...approvedRemote, ...raceCatalog, ...reports]);
  const results = mergedRaces.filter((race) => {
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
    return typeMatch && regionMatch && surfaceMatch && reliabilityMatch && distanceMatch;
  }).sort((a, b) => getReliabilityRank(a.reliability) - getReliabilityRank(b.reliability));

  const radarMeta = `
    <article class="radar-status ${raceRadarLoading ? "loading" : ""}">
      <span>${raceRadarStatus}</span>
      <b>${results.length} resultat(s)</b>
      <p>${raceRadarUpdatedAt ? `Derniere mise a jour API: ${formatDateTime(raceRadarUpdatedAt)}` : "Le radar utilise le catalogue local tant que l'API Vercel n'a pas repondu."}</p>
      <p>${communityStatus}</p>
    </article>
  `;

  // Helper : construit la carte HTML d'une course
  function buildRaceCard(race, pinned = false) {
    const isSource = !race.date;
    const dateText = isSource ? "Source calendrier" : formatFullDate(race.date);
    const status = race.date ? (daysUntil(race.date) < 0 ? "Archive / a verifier" : `J-${daysUntil(race.date)}`) : "A connecter";
    const pinnedBadge = pinned ? `<span class="race-pinned-badge">⭐ Selectionnee</span>` : "";
    return `
      <article class="race-result ${race.reliability || "calendar"}${pinned ? " pinned" : ""}">
        ${pinnedBadge}
        <div>
          <span>${status} - ${race.source} - ${getReliabilityLabel(race.reliability)}</span>
          <h3>${race.name}</h3>
          <p>${dateText} - ${race.location}</p>
        </div>
        <strong>${race.type}</strong>
        <div class="agenda-meta">
          <span>${race.distance ? `${race.distance} km` : "Distance variable"}</span>
          <span>${race.region}</span>
          <span>${race.surface || "Surface variable"}</span>
        </div>
        <p>${race.notes}</p>
        <div class="race-result-actions">
          <button class="secondary-button" data-open-race-source="${race.id}" type="button">Source</button>
          <button class="secondary-button" data-race-interest="${race.id}" type="button">${state.raceInterests[race.id] ? "✓ Interesse" : "Je suis interesse"}</button>
          <button class="primary-button" data-import-race="${race.id}" type="button" ${isSource ? "disabled" : ""}>Ajouter</button>
        </div>
        ${renderRaceInterestSummary(race)}
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
      const country = race.region || "Autre";
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

  fetchCommunityInterests(results.map((race) => race.id));
}

function renderRaceInterestSummary(race) {
  const interested = Boolean(state.raceInterests[race.id]);
  const remote = communityInterests[race.id] || { count: 0, people: [] };
  const remoteHasMe = remote.people.some((person) => person.name === (state.profile.name || "Musher"));
  const localExtra = interested && !remoteHasMe ? 1 : 0;
  const count = remote.count + localExtra;
  const names = [
    ...remote.people.map((person) => person.region ? `${person.name} (${person.region})` : person.name),
    ...(localExtra ? [state.profile.name || "Moi"] : [])
  ].slice(0, 4);

  return `
    <div class="race-interest ${interested ? "active" : ""}">
      <span>${count} personne(s) interessee(s)</span>
      <p>${names.length ? names.join(", ") : "Indique ton interet pour retrouver plus tard les personnes motivees par cette course."}</p>
    </div>
  `;
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

function importRaceToAgenda(id) {
  const race = mergeRaceSources([...remoteRaceCatalog, ...raceCatalog, ...state.missingRaceReports])
    .find((item) => item.id === id);
  if (!race || !race.date) return;
  const exists = state.agenda.some((item) => item.sourceId === race.id);
  if (exists) {
    alert("Cette course est deja dans ton agenda.");
    return;
  }

  state.agenda.push({
    id: `race-${Date.now()}`,
    sourceId: race.id,
    name: race.name,
    date: race.date,
    type: race.type,
    distance: Number(race.distance || 0),
    priority: "B",
    location: race.location,
    notes: `${race.notes} Source: ${race.source}`
  });
  saveState();
  render();
  alert("Course ajoutee a ton agenda.");
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
    notes: `Course signalee par ${currentUser?.email || "utilisateur"}.`,
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

function renderAgenda() {
  const list = document.querySelector('[data-list="agenda"]');
  if (!list) return;
  const races = [...state.agenda].sort((a, b) => new Date(a.date) - new Date(b.date));
  list.innerHTML = races.map((race) => {
    const days = daysUntil(race.date);
    const status = days < 0 ? "Terminee" : days === 0 ? "Aujourd'hui" : `J-${days}`;
    const readiness = getAgendaReadiness(race);
    return `
      <article class="agenda-card priority-${race.priority.toLowerCase()}">
        <div>
          <span>${status} - Priorite ${race.priority}</span>
          <h2>${race.name}</h2>
          <p>${formatFullDate(race.date)} - ${race.location || "Lieu a definir"}</p>
        </div>
        <strong>${race.distance} km</strong>
        <div class="agenda-meta">
          <span>${race.type}</span>
          <span>${readiness}</span>
        </div>
        <p>${race.notes || "Aucune note."}</p>
      </article>
    `;
  }).join("") || `<p class="empty-state">Aucune course prevue.</p>`;
  list.querySelectorAll(".agenda-card").forEach((card, index) => {
  card.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    const race = [...state.agenda]
      .sort((a, b) => new Date(a.date) - new Date(b.date))[index];

    const action = prompt(
      `Que faire avec ${race.name} ?\n\nTape:\nedit\nou\ndelete`
    );

    if (action === "delete") {
      if (confirm(`Supprimer ${race.name} ?`)) {
        state.agenda =
          state.agenda.filter(r => r.id !== race.id);

        saveState();
        render();
      }
    }

    if (action === "edit") {
      const newName =
        prompt("Nom de la course", race.name);

      if (newName) {
        race.name = newName;

        saveState();
        render();
      }
    }
  });
});
}

function renderOpenRuns() {
  const list = document.querySelector('[data-list="openRuns"]');
  if (!list) return;

  const openRuns = mergeOpenRuns([...remoteOpenRuns, ...state.openRuns])
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
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,wind_speed_10m,precipitation`;
      const response = await fetch(url);
      const data = await response.json();
      state.planWeather = {
        temperature: Number(data.current.temperature_2m || 0),
        wind: Number(data.current.wind_speed_10m || 0),
        precipitation: Number(data.current.precipitation || 0)
      };
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
  state.selectedDogIds = state.selectedDogIds.includes(id)
    ? state.selectedDogIds.filter((dogId) => dogId !== id)
    : [...state.selectedDogIds, id];
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

function startGPS() {
  if (!navigator.geolocation) {
    alert("GPS non disponible");
    return;
  }

  stopLiveLocation();
  gpsPath = [];
  lastPosition = null;
  if (polyline) {
    polyline.setLatLngs([]);
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      updateMapPosition(lat, lon, "Enregistrement GPS en cours");

      const gpsSpeed = position.coords.speed || 0;

      const point = {
        lat,
        lon,
        timestamp: Date.now(),
        speed: gpsSpeed
      };

      gpsPath.push(point);

if (polyline) {
  polyline.addLatLng([lat, lon]);
}

      if (lastPosition) {
        const segment = calculateDistance(
          lastPosition.lat,
          lastPosition.lon,
          lat,
          lon
        );

        if (segment < 1) {
          distance += segment;
        }
      }

      lastPosition = point;

      const hours = seconds / 3600;
      const calculatedSpeed = hours > 0 ? distance / hours : 0;

      distanceEl.textContent = distance.toFixed(2);
      speedEl.textContent = (
        gpsSpeed > 0
          ? gpsSpeed * 3.6
          : calculatedSpeed
      ).toFixed(1);

    },
    (error) => {
      console.error("GPS error:", error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}
  function stopGPS() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
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

    stopGPS();
    startLiveLocation();

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
  if (km >= 28) return "Sortie longue";
  if (speed >= 18) return "Sprint";
  if (speed <= 10 || km <= 6) return "Recuperation";
  if (speed >= 14 && km >= 12) return "Endurance";
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

  const run = {
    date: new Date().toISOString().slice(0, 10),
    type: document.querySelector("#runType").value,
    km: pendingRunSummary.km,
    speed: pendingRunSummary.speed,
    path: gpsPath,
    team: [...state.selectedDogIds],
    weather: document.querySelector("#weather").value,
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
});

document.querySelector('[data-action="toggleRaceForm"]').addEventListener("click", () => {
  raceForm.classList.toggle("hidden");
});

document.querySelector('[data-action="toggleOpenRunForm"]')?.addEventListener("click", () => {
  openRunForm.classList.toggle("hidden");
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
    dog.weight = Number(document.querySelector("#dog-weight").value || dog.weight || 22);
    dog.harness = document.querySelector("#dog-harness").value.trim();
    dog.vet = document.querySelector("#dog-vet").value.trim();
    dog.limitation = document.querySelector("#dog-limitation").value.trim();
    dog.note = document.querySelector("#dog-note").value.trim();
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
    harness: document.querySelector("#dog-harness").value.trim(),
    vet: document.querySelector("#dog-vet").value.trim(),
    limitation: document.querySelector("#dog-limitation").value.trim(),
    status: "Nouveau",
    km: 0
  };

  state.dogs.push(dog);
  state.selectedDogIds.push(dog.id);
  resetDogForm();
  saveState();
  render();
});

raceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#agenda-name").value.trim();
  const date = document.querySelector("#agenda-date").value;
  if (!name || !date) return;

  state.agenda.push({
    id: `race-${Date.now()}`,
    name,
    date,
    type: document.querySelector("#agenda-type").value,
    distance: Number(document.querySelector("#agenda-distance").value || 0),
    priority: document.querySelector("#agenda-priority").value,
    location: document.querySelector("#agenda-location").value.trim(),
    notes: document.querySelector("#agenda-notes").value.trim()
  });

  raceForm.reset();
  raceForm.classList.add("hidden");
  saveState();
  render();
});

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
      <p class="coach-welcome-hint">Tu peux poser une question précise dans le champ ci-dessus ou laisser vide pour une analyse complète.</p>
    </div>
  `;
}

async function requestCoachAnalysis() {
  const btn = document.querySelector("#coach-analyze-btn");
  const question = coachQuestion?.value?.trim() || "";

  btn.disabled = true;
  btn.textContent = "Analyse en cours…";

  coachResult.innerHTML = `
    <div class="coach-loading">
      <div class="coach-loading-spinner"></div>
      <p>Le Coach analyse tes données…</p>
      <small>Cela prend 10 à 20 secondes</small>
    </div>
  `;
  coachResult.dataset.hasResult = "1";

  // Prépare les données à envoyer
  const payload = {
    runs: state.runs.slice(0, 15),
    dogs: state.dogs,
    settings: {
      raceType: state.raceType,
      raceName: state.raceName || state.raceType || "Course objectif",
      raceKm: state.raceKm || 100,
      raceDate: state.raceDate || "",
      seasonMode: state.seasonMode,
      profileName: state.profile?.name || "Musher",
      profileLevel: state.profile?.level || "Amateur"
    },
    question
  };

  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!data.configured) {
      coachResult.innerHTML = `
        <div class="coach-error">
          <strong>⚙️ Coach IA non configuré</strong>
          <p>${data.message || "La clé API n'est pas encore configurée dans Vercel."}</p>
        </div>
      `;
      return;
    }

    if (data.error) {
      coachResult.innerHTML = `
        <div class="coach-error">
          <strong>❌ Erreur</strong>
          <p>${data.error}</p>
        </div>
      `;
      return;
    }

    // Affiche le résultat formaté
    coachResult.innerHTML = `
      <div class="coach-analysis">
        <div class="coach-analysis-meta">
          <span>Analyse du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
          ${question ? `<span>Question : "${question}"</span>` : ""}
        </div>
        <div class="coach-analysis-text">${formatCoachMarkdown(data.analysis)}</div>
        <button class="secondary-button coach-refresh-btn" id="coach-refresh-btn" type="button">🔄 Nouvelle analyse</button>
      </div>
    `;

    document.querySelector("#coach-refresh-btn")?.addEventListener("click", () => {
      delete coachResult.dataset.hasResult;
      coachResult.innerHTML = buildCoachWelcome();
    });

  } catch (err) {
    coachResult.innerHTML = `
      <div class="coach-error">
        <strong>❌ Erreur réseau</strong>
        <p>Impossible de contacter le Coach. Vérifie ta connexion.</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:-2px;margin-right:6px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Analyser`;
  }
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

["race-search-region", "race-search-type", "race-search-distance", "race-search-surface", "race-search-reliability"].forEach((id) => {
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
