const { infoEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

module.exports = {
  name: "topglobal",
  aliases: ["top", "ranking", "richest"],
  description: "Melihat leaderboard pemain terkaya dan tertinggi levelnya.",
  async execute({ message, args, db }) {
    const sub = (args[0] || "uang").toLowerCase();
    const cores = Object.values(db.state.cores);

    if (sub === "uang" || sub === "rich" || sub === "money") {
      const sorted = cores
        .filter(c => c.username)
        .map(c => ({ username: c.username, total: (c.uang || 0) + (c.bank || 0) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const medals = ["🥇", "🥈", "🥉"];
      const text = sorted.map((p, i) => {
        const medal = medals[i] || `${i + 1}.`;
        return `${medal} **${p.username}** — ${money(p.total)}`;
      }).join("\n");

      return message.reply({
        embeds: [
          infoEmbed(
            "💰 Top 10 Terkaya",
            text || "Belum ada pemain yang terdaftar."
          )
        ]
      });
    }

    if (sub === "level" || sub === "lvl" || sub === "xp") {
      const sorted = cores
        .filter(c => c.username)
        .sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0))
        .slice(0, 10);

      const medals = ["🥇", "🥈", "🥉"];
      const text = sorted.map((p, i) => {
        const medal = medals[i] || `${i + 1}.`;
        return `${medal} **${p.username}** — Lv.${p.level || 1} (${p.xp || 0} XP)`;
      }).join("\n");

      return message.reply({
        embeds: [
          infoEmbed(
            "⭐ Top 10 Level Tertinggi",
            text || "Belum ada pemain yang terdaftar."
          )
        ]
      });
    }

    if (sub === "sedekah" || sub === "amal") {
      const sorted = cores
        .filter(c => c.username && (c.total_sedekah || 0) > 0)
        .sort((a, b) => (b.total_sedekah || 0) - (a.total_sedekah || 0))
        .slice(0, 10);

      const medals = ["🥇", "🥈", "🥉"];
      const text = sorted.map((p, i) => {
        const medal = medals[i] || `${i + 1}.`;
        return `${medal} **${p.username}** — ${money(p.total_sedekah || 0)}`;
      }).join("\n");

      return message.reply({
        embeds: [
          infoEmbed(
            "💝 Top 10 Paling Dermawan",
            text || "Belum ada yang bersedekah."
          )
        ]
      });
    }

    return message.reply({
      embeds: [
        infoEmbed(
          "Leaderboard",
          "Pilih kategori:\n`.topglobal uang` — Terkaya\n`.topglobal level` — Level tertinggi\n`.topglobal sedekah` — Paling dermawan"
        )
      ]
    });
  }
};
