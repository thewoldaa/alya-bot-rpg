const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

module.exports = {
  name: "daily",
  aliases: ["harian"],
  description: "Klaim hadiah harianmu.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (profile.last_daily_at && now - profile.last_daily_at < oneDay) {
      const timeLeftMs = oneDay - (now - profile.last_daily_at);
      const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
      return message.reply({ embeds: [errorEmbed("Gagal", `Kamu sudah klaim hadiah hari ini!\nTunggu **${hours} jam ${minutes} menit** lagi.`)] });
    }

    const reward = randInt(1500, 3000);

    await db.updateCore(profile.core_id, (core) => {
      core.uang = (core.uang || 0) + reward;
      core.last_daily_at = now;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "🎁 Daily Reward",
          `Kamu mendapatkan **${money(reward)}** dari hadiah harian!\nJangan lupa kembali besok!`
        )
      ]
    });
  }
};
