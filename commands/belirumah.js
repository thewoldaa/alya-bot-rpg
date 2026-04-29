const { successEmbed, infoEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { findHouse, hasHouse } = require("../utils/helpers");
const { money } = require("../utils/format");

function renderHouses(config) {
  return config.houseCatalog
    .map((house) => `- **${house.key}** (${house.name}) - ${money(house.price)}\n  ${house.desc}`)
    .join("\n");
}

module.exports = {
  name: "belirumah",
  aliases: ["rumah"],
  description: "Membeli rumah.",
  async execute({ message, args, db, config }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const input = args.join(" ").trim();
    if (!input) {
      return message.reply({
        embeds: [infoEmbed("Daftar Rumah", renderHouses(config))]
      });
    }

    const house = findHouse(input);
    if (!house) {
      return message.reply({
        embeds: [errorEmbed("Rumah Tidak Ditemukan", renderHouses(config))]
      });
    }

    const current = db.getCoreByDiscordId(message.author.id);
    if (hasHouse(current) && current.rumah?.price >= house.price) {
      return message.reply({
        embeds: [errorEmbed("Sudah Punya Rumah", "Kamu sudah punya rumah dengan tier setara atau lebih tinggi.")]
      });
    }

    if ((current.uang || 0) < house.price) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Butuh ${money(house.price)}.`)]
      });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.uang = Math.max(0, Number(core.uang || 0) - house.price);
      core.rumah = {
        tier: house.key,
        name: house.name,
        price: house.price,
        boughtAt: Date.now()
      };
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Rumah Dibeli",
          `Kamu membeli **${house.name}** seharga ${money(house.price)}.`
        )
      ]
    });
  }
};
