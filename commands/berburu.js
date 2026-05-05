const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

module.exports = {
  name: "berburu",
  aliases: ["hunt", "hunting"],
  description: "Pergi berburu monster di hutan untuk mendapatkan hadiah.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (profile.jail_until && profile.jail_until > Date.now()) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu nggak bisa berburu dari penjara!")] });
    }

    const now = Date.now();
    const cooldownMs = 4 * 60 * 1000;

    if (profile.last_berburu_at && now - profile.last_berburu_at < cooldownMs) {
      const timeLeft = Math.ceil((cooldownMs - (now - profile.last_berburu_at)) / 1000);
      return message.reply({ embeds: [errorEmbed("Sabar", `Kamu kelelahan setelah berburu. Istirahat **${timeLeft} detik** lagi.`)] });
    }

    const hungerCost = 10;
    if ((profile.hunger || 0) < hungerCost) {
      return message.reply({ embeds: [errorEmbed("Lapar", "Kamu terlalu lapar untuk berburu! Makan dulu pakai `.mk`.")] });
    }

    const chance = Math.random();
    let monster, reward, xp;

    if (chance < 0.05) {
      monster = "🐲 Dragon Muda (Legendary)";
      reward = randInt(8000, 20000);
      xp = randInt(50, 100);
    } else if (chance < 0.2) {
      monster = "🐻 Beruang Gua (Rare)";
      reward = randInt(2000, 5000);
      xp = randInt(20, 40);
    } else if (chance < 0.5) {
      monster = "🐗 Babi Hutan (Common)";
      reward = randInt(500, 1500);
      xp = randInt(10, 20);
    } else if (chance < 0.85) {
      monster = "🐇 Kelinci Liar (Common)";
      reward = randInt(100, 400);
      xp = randInt(5, 10);
    } else {
      monster = "💨 Angin Lewat (Gagal)";
      reward = 0;
      xp = 2;
    }

    await db.updateCore(profile.core_id, (core) => {
      core.uang = (core.uang || 0) + reward;
      core.xp = (core.xp || 0) + xp;
      core.hunger = Math.max(0, (core.hunger || 0) - hungerCost);
      core.last_berburu_at = now;

      while (core.xp >= db.getXpNeed(core.level)) {
        core.xp -= db.getXpNeed(core.level);
        core.level += 1;
      }
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "🏹 Hasil Berburu",
          `Kamu memasuki hutan gelap dan menemukan **${monster}**!\n${reward > 0 ? `Kamu berhasil mengalahkannya dan mendapat **${money(reward)}** serta **${xp} XP**!` : `Tidak ada yang bisa ditangkap... Tapi kamu dapat **${xp} XP** dari pengalaman.`}`
        )
      ]
    });
  }
};
