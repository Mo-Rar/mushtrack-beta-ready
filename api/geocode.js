// Proxy Nominatim côté serveur pour éviter les blocages CORS/réseau depuis l'app
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Paramètre q manquant" });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MushTrack/1.2 (morardjuan@hotmail.com)",
        "Accept-Language": "fr"
      }
    });
    clearTimeout(timer);
    const data = await response.json();
    if (data && data[0]) {
      return res.status(200).json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    }
    return res.status(200).json(null);
  } catch {
    return res.status(200).json(null);
  }
}
