const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

module.exports = {
  name: "mancing",
  aliases: ["fish", "fishing"],
  description: "Pergi memancing untuk mendapatkan ikan dan menjualnya.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (profile.jail_until && profile.jail_until > Date.now()) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu nggak bisa mancing dari dalam penjara!")] });
    }

    const now = Date.now();
    const cooldownMs = 3 * 60 * 1000; // 3 menit cooldown

    if (profile.last_mancing_at && now - profile.last_mancing_at < cooldownMs) {
      const timeLeft = Math.ceil((cooldownMs - (now - profile.last_mancing_at)) / 1000);
      return message.reply({ embeds: [errorEmbed("Sabar", `Kolam ikannya lagi sepi. Tunggu **${timeLeft} detik** lagi buat mancing.`)] });
    }

    const modalMancing = 50; // Beli umpan
    if ((profile.uang || 0) < modalMancing) {
      return message.reply({ embeds: [errorEmbed("Miskin", `Kamu butuh modal ${money(modalMancing)} buat beli umpan! (Ketik \`.daily\` kalau bangkrut)`)] });
    }

    // Gacha Ikan
    const chance = Math.random();
    let ikan = "";
    let harga = 0;

    if (chance < 0.1) {
      ikan = "🦈 Hiu Putih (Legendary)";
      harga = randInt(5000, 10000);
    } else if (chance < 0.3) {
      ikan = "🐡 Ikan Buntal (Rare)";
      harga = randInt(1000, 2500);
    } else if (chance < 0.7) {
      ikan = "🐟 Ikan Mas (Common)";
      harga = randInt(200, 600);
    } else {
      ikan = "👢 Sepatu Butut (Sampah)";
      harga = randInt(10, 50);
    }

    const profit = harga - modalMancing;

    await db.updateCore(profile.core_id, (core) => {
      core.uang = (core.uang || 0) + profit;
      core.last_mancing_at = now;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "🎣 Hasil Pancingan",
          `Kamu memancing dan mendapatkan **${ikan}**!\nIkan tersebut langsung dijual seharga **${money(harga)}**.\n\n*(Modal umpan: -${money(modalMancing)})*\nTotal Profit: **${money(profit)}**`
        )
      ]
    });
  }
};
