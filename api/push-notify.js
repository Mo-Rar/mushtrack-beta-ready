// Cron job Vercel — envoie des notifications push si inactivité détectée
const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  "mailto:morardjuan@hotmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async (req, res) => {
  // Sécurité : clé secrète pour le cron
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) throw error;
    if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 });

    const results = await Promise.allSettled(
      subs.map(async (row) => {
        const sub = JSON.parse(row.subscription);

        // Vérifie si l'utilisateur a des données de sortie dans Supabase
        // Si pas de user_id on envoie quand même (mode localStorage only)
        let shouldNotify = true;
        let message = "Tu n'as pas fait de sortie depuis 5 jours. Continue ton entraînement ! 🐕‍🦺";
        let daysSinceRun = null;

        if (row.user_id) {
          // Récupère les runs des 7 derniers jours pour cet utilisateur
          const cutoff = new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0];
          const { data: runs } = await supabase
            .from("runs")
            .select("date")
            .eq("user_id", row.user_id)
            .gte("date", cutoff)
            .order("date", { ascending: false })
            .limit(1);

          if (runs && runs.length > 0) {
            // Sortie récente détectée — pas de notification
            shouldNotify = false;
          } else {
            // Calcule les jours depuis la dernière sortie
            const { data: lastRun } = await supabase
              .from("runs")
              .select("date")
              .eq("user_id", row.user_id)
              .order("date", { ascending: false })
              .limit(1);

            if (lastRun && lastRun.length > 0) {
              const last = new Date(lastRun[0].date + "T12:00:00");
              daysSinceRun = Math.round((Date.now() - last.getTime()) / 86400000);
              message = `Aucune sortie depuis ${daysSinceRun} jours. Tes chiens sont prêts à courir ! 🐕‍🦺❄️`;
            }
          }
        }

        // Vérifie les rappels vétérinaires (vaccins/vermifuges à venir)
        let vetNotif = null;
        if (row.user_id) {
          const { data: userData } = await supabase
            .from("mushtrack_user_data")
            .select("dogs")
            .eq("user_id", row.user_id)
            .single();

          if (userData?.dogs) {
            const today = new Date(); today.setHours(0,0,0,0);
            for (const dog of userData.dogs) {
              for (const event of (dog.healthHistory || [])) {
                if (!event.nextDue) continue;
                const due = new Date(event.nextDue + "T12:00:00");
                const days = Math.round((due - today) / 86400000);
                if (days >= 0 && days <= 7) {
                  const typeLabel = event.type === "vaccin" ? "Vaccin" : "Vermifuge";
                  const dayLabel  = days === 0 ? "aujourd'hui" : days === 1 ? "demain" : `dans ${days} jours`;
                  vetNotif = {
                    title: `MushTrack — Rappel santé ${dog.name}`,
                    body: `${typeLabel} de ${dog.name} prévu ${dayLabel}${event.notes ? ` (${event.notes})` : ""}. N'oublie pas ! 🐾`,
                    tag: `mushtrack-vet-${dog.id}-${event.nextDue}`
                  };
                  break;
                }
              }
              if (vetNotif) break;
            }
          }
        }

        const notifications = [];
        if (vetNotif) {
          notifications.push(JSON.stringify({
            ...vetNotif,
            icon: "/assets/icon-192.png",
            badge: "/assets/icon-192.png",
            renotify: true,
            data: { url: "/" }
          }));
        }
        if (shouldNotify) {
          notifications.push(JSON.stringify({
            title: "MushTrack — Rappel d'entraînement",
            body: message,
            icon: "/assets/icon-192.png",
            badge: "/assets/icon-192.png",
            tag: "mushtrack-inactivite",
            renotify: false,
            data: { url: "/" }
          }));
        }

        if (notifications.length === 0) return { skipped: true };

        for (const payload of notifications) {
          await webpush.sendNotification(sub, payload);
        }
        return { sent: notifications.length };
      })
    );

    const sent = results.filter(r => r.status === "fulfilled" && r.value?.sent).length;
    const skipped = results.filter(r => r.status === "fulfilled" && r.value?.skipped).length;
    const errors = results.filter(r => r.status === "rejected").length;

    // Nettoie les abonnements invalides (erreur 410 Gone)
    await Promise.allSettled(
      subs.map(async (row, i) => {
        const result = results[i];
        if (result.status === "rejected") {
          const err = result.reason;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
          }
        }
      })
    );

    res.status(200).json({ sent, skipped, errors });
  } catch (err) {
    console.error("push-notify error:", err);
    res.status(500).json({ error: err.message });
  }
};
