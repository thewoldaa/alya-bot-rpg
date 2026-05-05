const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

module.exports = {
  name: "ambil",
  aliases: ["claim"],
  description: "Memungut uang dari hujan uang.",
  async execute({ client, message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (!client.activeRain) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Lagi nggak ada hujan uang kok!")] }).catch(() => {});
    }

    if (client.activeRain.channelId !== message.channel.id) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Hujan uangnya turun di channel lain!")] }).catch(() => {});
    }

    if (client.activeRain.winners.some(w => w.id === message.author.id)) {
      return message.reply({ embeds: [errorEmbed("Maruk", "Bagi-bagi dong! Kamu kan udah pungut uangnya.")] }).catch(() => {});
    }

    const rain = client.activeRain;
    const chunk = rain.chunks.pop(); // Ambil dari array yang sudah dishuffle

    // Berikan uang ke player
    await db.updateCore(profile.core_id, (core) => {
      core.uang = (core.uang || 0) + chunk;
      return core;
    });

    rain.winners.push({ id: message.author.id, username: message.author.username, amount: chunk });

    if (rain.chunks.length === 0) {
      // Hujan selesai
      client.activeRain = null;

      // Urutkan pemenang dari yang dapat paling banyak
      const sortedWinners = rain.winners.sort((a, b) => b.amount - a.amount);
      const winnersText = sortedWinners.map((w, i) => `${i + 1}. **${w.username}** mendapat ${money(w.amount)}`).join("\n");

      return message.channel.send({
        embeds: [
          successEmbed(
            "🌧️ HUJAN UANG SELESAI 🌧️",
            `Semua uang sudah habis dipungut!\n\n**Daftar Hoki:**\n${winnersText}\n\nSelamat buat yang dapet banyak! Yang dapet dikit jangan nangis ya~`
          )
        ]
      });
    } else {
      return message.reply(`💸 *Dapat **${money(chunk)}**!* (Sisa kuota: ${rain.chunks.length} orang lagi)`);
    }
  }
};
