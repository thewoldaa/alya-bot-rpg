const { successEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { hungerMax, hungerEatAmount } = require("../config");

module.exports = {
  name: "mk",
  aliases: ["makan"],
  description: "Makan untuk mengisi hunger.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const result = await db.updateCore(profile.core_id, (core) => {
      core.hunger = Math.min(hungerMax, Number(core.hunger ?? hungerMax) + hungerEatAmount);
      core.last_meal_at = Date.now();
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Makan",
          `Kamu makan dan hunger naik menjadi **${result.hunger}** / ${hungerMax}.`
        )
      ]
    });
  }
};
