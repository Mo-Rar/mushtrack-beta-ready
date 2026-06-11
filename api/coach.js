// api/coach.js — Coach MushTrack IA (Vercel serverless)
// Appelle l'API Claude avec les données d'entraînement de l'utilisateur

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non supportée." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(200).json({
      configured: false,
      message: "Clé API Coach non configurée. Ajoute ANTHROPIC_API_KEY dans les variables Vercel."
    });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    res.status(400).json({ error: "Corps de requête invalide." });
    return;
  }

  const { runs = [], dogs = [], settings = {}, question = "" } = body;

  // ── Construire le prompt ─────────────────────────────────────────
  const prompt = buildPrompt({ runs, dogs, settings, question });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(500).json({ error: `Erreur API: ${response.status} — ${text}` });
      return;
    }

    const data = await response.json();
    const analysis = data.content?.[0]?.text || "Pas de réponse.";

    res.status(200).json({ configured: true, analysis });
  } catch (err) {
    res.status(500).json({ error: "Erreur réseau vers l'API Claude: " + err.message });
  }
};

// ── Construction du prompt personnalisé ─────────────────────────────
function buildPrompt({ runs, dogs, settings, question }) {
  const raceType = settings.raceType || "Mid-distance";
  const raceName = settings.raceName || "Course objectif";
  const raceKm = settings.raceKm || 100;
  const raceDate = settings.raceDate || "date inconnue";
  const seasonMode = settings.seasonMode === "summer" ? "Été / Dryland" : "Hiver / Neige";
  const profileName = settings.profileName || "Musher";
  const profileLevel = settings.profileLevel || "Amateur";

  // Chiens actifs
  const dogsSummary = dogs.length > 0
    ? dogs.map((d) =>
        `- ${d.name} (${d.breed || "race inconnue"}, ${d.age || "?"} ans, rôle: ${d.role || "inconnu"}, état: ${d.healthSignal || "ok"})`
      ).join("\n")
    : "Aucun chien enregistré.";

  // Dernières sorties (max 15)
  const recentRuns = runs.slice(0, 15);
  const runsSummary = recentRuns.length > 0
    ? recentRuns.map((r, i) => {
        const pace = (r.avgSpeed && r.avgSpeed > 0)
          ? `allure ${(60 / r.avgSpeed).toFixed(1)} min/km`
          : "";
        const dur = r.duration ? `${Math.round(r.duration / 60)} min` : "";
        return `  ${i + 1}. ${r.date || "?"} — ${r.type || "sortie"} — ${Number(r.km).toFixed(1)} km` +
          (r.avgSpeed ? ` — ${Number(r.avgSpeed).toFixed(1)} km/h` : "") +
          (pace ? ` (${pace})` : "") +
          (dur ? ` — ${dur}` : "") +
          (r.energy ? ` — énergie ${r.energy}/5` : "") +
          (r.recovery ? ` — récup: ${r.recovery}` : "") +
          (r.notes ? ` — "${r.notes}"` : "");
      }).join("\n")
    : "Aucune sortie enregistrée.";

  // Stats globales
  const totalKm = runs.reduce((s, r) => s + Number(r.km || 0), 0).toFixed(1);
  const avgSpeed = runs.length > 0
    ? (runs.reduce((s, r) => s + Number(r.avgSpeed || 0), 0) / runs.length).toFixed(1)
    : "0";
  const last7Days = runs
    .filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return (Date.now() - d.getTime()) < 7 * 24 * 3600 * 1000;
    })
    .reduce((s, r) => s + Number(r.km || 0), 0).toFixed(1);

  const userQuestion = question
    ? `\n\nQuestion spécifique du musher : "${question}"`
    : "";

  return `Tu es le Coach MushTrack, un expert en entraînement pour les sports de chiens (mushing, canicross, skijoring, dryland, bikejoring). Tu combines les connaissances en physiologie canine, nutrition sportive et planification d'entraînement pour chiens nordiques et de sport.

== PROFIL DU MUSHER ==
Nom : ${profileName}
Niveau : ${profileLevel}
Saison actuelle : ${seasonMode}
Discipline / Type de course : ${raceType}

== OBJECTIF COURSE ==
Course cible : ${raceName}
Distance : ${raceKm} km
Date de la course : ${raceDate}

== CHIENS DE L'ATTELAGE ==
${dogsSummary}

== STATISTIQUES D'ENTRAÎNEMENT ==
Kilomètres totaux enregistrés : ${totalKm} km
Vitesse moyenne générale : ${avgSpeed} km/h
Volume des 7 derniers jours : ${last7Days} km
Nombre de sorties enregistrées : ${runs.length}

== DÉTAIL DES DERNIÈRES SORTIES ==
${runsSummary}
${userQuestion}

== TA MISSION ==
Analyse ces données et fournis un rapport de coaching complet structuré ainsi :

**🎯 Évaluation actuelle**
Bilan honnête du niveau de préparation actuel (condition physique estimée, volume, régularité, qualité des sorties). Sois direct.

**📊 Analyse des tendances**
Ce qui progresse bien, ce qui stagne ou inquiète. Signale tout pattern préoccupant (surcharge, sous-entraînement, récupération insuffisante, vitesse trop basse, énergie en baisse).

**🗓️ Plan 4 semaines recommandé**
Programme semaine par semaine avec volume km, types de sorties, intensités et jours de repos. Adapté à la course objectif ${raceName} (${raceKm} km).

**🐕 Points d'attention sur les chiens**
Conseils spécifiques selon les chiens renseignés (signes à surveiller, nutrition, récupération, gestion d'attelage).

**⚡ Actions prioritaires cette semaine**
Maximum 3 actions concrètes à faire immédiatement.

**⚠️ Alertes**
Ce qui doit être corrigé avant de continuer à progresser (si applicable).

Réponds en français. Sois précis, concret et direct — comme un vrai coach de haut niveau qui connaît bien le mushing et le canicross. Pas de généralités inutiles.`;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
