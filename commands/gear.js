const { infoEmbed } = require("../utils/embeds");

const { formatGearList, formatEquipment, getGearBonuses } = require("../utils/gear");

module.exports = {
  name: "gear",
  aliases: ["equipment"],
  description: "Melihat gear dan bonus equipment.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const bonuses = getGearBonuses(profile);
    const content = [
      "**Equipment Kamu**",
      formatEquipment(profile),
      "",
      "**Bonus Aktif**",
      `Money Bonus: +${(bonuses.moneyBonus * 100).toFixed(1)}%`,
      `XP Bonus: +${(bonuses.xpBonus * 100).toFixed(1)}%`,
      `Hunger Reduction: ${bonuses.hungerReduction}`,
      `Luck Bonus: +${(bonuses.luckBonus * 100).toFixed(1)}%`,
      "",
      "**Gear Tersedia**",
      formatGearList(),
      "",
      `Beli gear via \`.shop\` lalu pasang dengan \`.equip <nama>\`. Enchant pakai \`.enchant <slot>\` dan \`enchant_stone\`.`
    ].join("\n");

    return message.reply({
      embeds: [infoEmbed("Gear", content)]
    });
  }
};
