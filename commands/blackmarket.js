const { infoEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { randInt } = require("../utils/random");
const { money } = require("../utils/format");

module.exports = {
  name: "blackmarket",
  aliases: ["bm"],
  description: "Pasar gelap yang hanya buka di tengah malam (00:00 - 06:00).",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    // Check time (only open from 00:00 to 06:00)
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 24) {
      return message.reply({
        embeds: [errorEmbed("Toko Tutup", "Pasar gelap saat ini tutup. Penjual hanya muncul di tengah malam hingga subuh (00:00 - 06:00).")]
      });
    }

    // Fluctuating price based on the current day to be same for everyone on the same day
    const daySeed = new Date().getDate();
    const price = 15000 + (daySeed * 500) % 15000; // Fluctuates between 15k and 30k

    const action = args[0]?.toLowerCase();

    if (action === "beli") {
      if (profile.uang < price) {
        return message.reply({
          embeds: [errorEmbed("Uang Kurang", `Kamu butuh **${money(price)}** untuk membeli barang ini.`)]
        });
      }

      await db.updateCore(profile.core_id, (core) => {
        core.uang -= price;
        return core;
      });
      await db.addInventoryItem(profile.core_id, "limit_break", 1);

      return message.reply({
        embeds: [
          successEmbed(
            "Transaksi Gelap Berhasil",
            `Kamu menyerahkan **${money(price)}** dan mendapatkan misterius **Limit Break Material**.`
          )
        ]
      });
    }

    return message.reply({
      embeds: [
        infoEmbed(
          "🕵️ Black Market",
          `*"Ssst... Jangan beritahu siapapun. Aku punya barang bagus hari ini."*\n\n**Limit Break Material**\nHarga hari ini: **${money(price)}**\n\nKetik \`.blackmarket beli\` untuk membelinya.`
        ).setColor("#1a1a1a")
      ]
    });
  }
};
