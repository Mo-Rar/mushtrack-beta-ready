module.exports = async function handler(req, res) {
  const host = req.headers.host;
  const protocol = host && host.includes("localhost") ? "http" : "https";
  const target = `${protocol}://${host}/api/races?refresh=1&deep=1`;

  try {
    const response = await fetch(target, {
      headers: { "user-agent": "MushTrackRaceRadarCron/0.1" },
      signal: AbortSignal.timeout(9000)
    });
    res.status(200).json({
      ok: response.ok,
      warmed: target,
      status: response.status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      warmed: target,
      error: error.message,
      updatedAt: new Date().toISOString()
    });
  }
};
