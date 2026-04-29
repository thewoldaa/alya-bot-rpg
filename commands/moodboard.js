const { infoEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");

module.exports = {
  name: "moodboard",
  aliases: ["mood"],
  description: "Melacak dan menampilkan kalender tingkat mood kamu hari ini.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const input = args[0]?.toLowerCase();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    let history = profile.mood_history || [];

    if (input === "yes" || input === "no") {
      const existingIdx = history.findIndex(h => h.date === today);
      if (existingIdx !== -1) {
        history[existingIdx].mood = input;
      } else {
        history.push({ date: today, mood: input });
      }

      // Keep only last 30 days
      if (history.length > 30) history = history.slice(history.length - 30);

      await db.updateCore(profile.core_id, (core) => {
        core.mood_history = history;
        return core;
      });

      message.reply(`Mood hari ini (${today}) berhasil dicatat sebagai **${input.toUpperCase()}**.`);
    } else if (input) {
      return message.reply("Input tidak valid! Gunakan `.moodboard yes` atau `.moodboard no`.");
    }

    if (history.length === 0) {
      return message.reply({
        embeds: [infoEmbed("Moodboard Kosong", "Kamu belum pernah mencatat mood. Coba ketik `.moodboard yes` atau `.moodboard no`.")]
      });
    }

    // Tampilkan 7 hari terakhir
    const recent = history.slice(-7);
    const board = recent.map(h => {
      const emoji = h.mood === "yes" ? "🟩 (Bagus)" : "🟥 (Buruk)";
      return `\`${h.date}\` : ${emoji}`;
    }).join("\n");

    return message.reply({
      embeds: [
        infoEmbed(
          `📊 Moodboard: ${message.author.username}`,
          `Berikut adalah catatan mood kamu belakangan ini:\n\n${board}\n\n*Ketik \`.moodboard yes/no\` untuk mencatat mood hari ini.*`
        )
      ]
    });
  }
};
