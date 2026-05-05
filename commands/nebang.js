const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

module.exports = {
  name: "nebang",
  aliases: ["tebang", "lumber"],
  description: "Menebang pohon untuk menjual kayu.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (profile.jail_until && profile.jail_until > Date.now()) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Nggak bisa nebang dari penjara!")] });
    }

    const now = Date.now();
    const cooldownMs = 3 * 60 * 1000;

    if (profile.last_nebang_at && now - profile.last_nebang_at < cooldownMs) {
      const timeLeft = Math.ceil((cooldownMs - (now - profile.last_nebang_at)) / 1000);
      return message.reply({ embeds: [errorEmbed("Sabar", `Kapakmu tumpul. Tunggu **${timeLeft} detik** buat istirahat.`)] });
    }

    const modalKapak = 75;
    if ((profile.uang || 0) < modalKapak) {
      return message.reply({ embeds: [errorEmbed("Miskin", `Butuh ${money(modalKapak)} untuk sewa kapak!`)] });
    }

    const chance = Math.random();
    let hasil, harga;

    if (chance < 0.08) {
      hasil = "🌳 Kayu Jati Emas (Mythic)";
      harga = randInt(10000, 25000);
    } else if (chance < 0.25) {
      hasil = "🪵 Kayu Mahoni (Rare)";
      harga = randInt(1500, 4000);
    } else if (chance < 0.7) {
      hasil = "🪓 Kayu Pinus (Common)";
      harga = randInt(300, 800);
    } else {
      hasil = "🍂 Ranting Kering (Sampah)";
      harga = randInt(15, 60);
    }

    const profit = harga - modalKapak;

    await db.updateCore(profile.core_id, (core) => {
      core.uang = (core.uang || 0) + profit;
      core.last_nebang_at = now;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "🪓 Hasil Tebangan",
          `Kamu menebang pohon dan mendapat **${hasil}**!\nDijual seharga **${money(harga)}**.\n\n*(Sewa kapak: -${money(modalKapak)})*\nProfit: **${money(profit)}**`
        )
      ]
    });
  }
};
