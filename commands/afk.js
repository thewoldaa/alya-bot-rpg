const { successEmbed } = require("../utils/embeds");

const { timeAgo } = require("../utils/format");

module.exports = {
  name: "afk",
  aliases: [],
  description: "Mengaktifkan status AFK.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const raw = args.join(" ").trim();
    const lower = raw.toLowerCase();

    if (["off", "stop", "keluar", "matikan", "hapus", "clear", "nonaktif"].includes(lower)) {
      const wasAfk = profile.afk?.active;
      const duration = wasAfk ? timeAgo(profile.afk.since) : null;
      await db.setAfk(profile.core_id, {
        active: false,
        reason: "",
        since: 0
      });

      return message.reply({
        embeds: [
          successEmbed(
            "AFK Dimatikan",
            wasAfk
              ? `Status AFK kamu sudah dimatikan.\nDurasi: **${duration}**`
              : "Status AFK kamu sudah nonaktif."
          )
        ]
      });
    }

    const reason = raw || "AFK";
    await db.setAfk(profile.core_id, {
      active: true,
      reason,
      since: Date.now()
    });

    return message.reply({
      embeds: [
        successEmbed("AFK Aktif", `Kamu sekarang AFK.\nAlasan: **${reason}**`)
      ]
    });
  }
};
