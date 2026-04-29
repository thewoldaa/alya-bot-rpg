const { infoEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireRegistered, isOwner } = require("../utils/guards");
const { getRandomLocalCharacter, getRandomApiCharacter } = require("../utils/characterSearch");
const { chance } = require("../utils/random");
const { money } = require("../utils/format");

module.exports = {
  name: "gacha",
  aliases: ["pull", "roll"],
  description: "Pull a random anime character for 5000 money.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const price = 5000;
    if (Number(profile.uang || 0) < price) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Gacha butuh **${money(price)}**. Uangmu: **${money(profile.uang || 0)}**`)]
      });
    }

    // Roll character
    const useApi = chance(30);
    let character = null;

    if (useApi) {
      character = await getRandomApiCharacter().catch(() => null);
    }
    
    if (!character) {
      character = getRandomLocalCharacter();
    }

    if (!character) {
      return message.reply({
        embeds: [errorEmbed("Gacha Gagal", "Database character kosong atau sedang bermasalah.")]
      });
    }

    // Deduct money
    await db.addMoney(profile.core_id, -price);

    // Build embed
    const embed = successEmbed(
      "Gacha Pull! 🎉",
      [
        `Kamu membayar **${money(price)}**...`,
        "Dan mendapatkan:",
        "",
        `Nama: **${character.name}**`,
        `Anime: **${character.anime}**`,
        `ID: **${character.id}**`,
        `Source: **${character.source === "jikan" ? "Jikan API" : "Local Database"}**`,
        "",
        "Gunakan `.character <nama>` untuk melamar character ini jika kamu belum punya claim atau ingin ganti!"
      ].join("\n")
    );

    if (character.image) {
      embed.setImage(character.image);
    }

    return message.reply({ embeds: [embed] });
  }
};
