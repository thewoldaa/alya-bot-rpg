const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

module.exports = {
  name: "tambang",
  aliases: ["mine", "mining"],
  description: "Pergi menambang mineral ke dalam gua.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (profile.jail_until && profile.jail_until > Date.now()) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu nggak bisa nambang dari dalam penjara!")] });
    }

    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000; // 5 menit cooldown

    if (profile.last_tambang_at && now - profile.last_tambang_at < cooldownMs) {
      const timeLeft = Math.ceil((cooldownMs - (now - profile.last_tambang_at)) / 1000);
      return message.reply({ embeds: [errorEmbed("Sabar", `Tenagamu habis buat mukul batu. Tunggu **${timeLeft} detik** lagi buat nambang.`)] });
    }

    const modalTambang = 100; // Beli beliak/pilih
    if ((profile.uang || 0) < modalTambang) {
      return message.reply({ embeds: [errorEmbed("Miskin", `Kamu butuh modal ${money(modalTambang)} buat sewa cangkul tambang!`)] });
    }

    // Gacha Mineral
    const chance = Math.random();
    let hasil = "";
    let harga = 0;

    if (chance < 0.05) {
      hasil = "💎 Berlian Murni (Mythic)";
      harga = randInt(15000, 30000);
    } else if (chance < 0.2) {
      hasil = "🥇 Emas Batangan (Rare)";
      harga = randInt(2000, 5000);
    } else if (chance < 0.6) {
      hasil = "🥈 Bijih Besi (Common)";
      harga = randInt(300, 1000);
    } else {
      hasil = "🪨 Batu Kerikil (Sampah)";
      harga = randInt(10, 50);
    }

    const profit = harga - modalTambang;

    await db.updateCore(profile.core_id, (core) => {
      core.uang = (core.uang || 0) + profit;
      core.last_tambang_at = now;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "⛏️ Hasil Tambang",
          `Kamu memukul batu keras-keras dan menemukan **${hasil}**!\nMineral tersebut langsung dijual seharga **${money(harga)}**.\n\n*(Sewa cangkul: -${money(modalTambang)})*\nTotal Profit: **${money(profit)}**`
        )
      ]
    });
  }
};
