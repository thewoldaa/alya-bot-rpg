const { infoEmbed } = require("../utils/embeds");

const { formatInventory, hasHouse, formatEquipment } = require("../utils/helpers");
const { money } = require("../utils/format");
const { getGearBonuses } = require("../utils/gear");
const { summarizePortfolio } = require("../utils/stockTrade");

module.exports = {
  name: "inv",
  aliases: ["inventory"],
  description: "Melihat inventory.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const portfolio = summarizePortfolio(db, profile.portfolio || {});
    const bonuses = getGearBonuses(profile);

    const content = [
      `Nama: **${profile.username}**`,
      `Level: **${profile.level}**`,
      `XP: **${profile.xp}** / ${db.getXpNeed(profile.level)}`,
      `Uang: **${money(profile.uang)}**`,
      `Limit: **${profile.limit}**`,
      `Mood: **${profile.mood || "normal"}**`,
      `Hubungan: **${profile.hubungan}**`,
      `Rumah: **${hasHouse(profile) ? profile.rumah.tier : "Tidak punya"}**`,
      `Bonus Gear: money +${(bonuses.moneyBonus * 100).toFixed(1)}% | xp +${(bonuses.xpBonus * 100).toFixed(1)}% | hunger -${bonuses.hungerReduction}`,
      `Portfolio: **${money(portfolio.totalValue)}**`,
      "",
      "**Equipment**",
      formatEquipment(profile),
      "",
      "**Inventory**",
      formatInventory(profile)
    ].join("\n");

    return message.reply({
      embeds: [infoEmbed("Inventory", content)]
    });
  }
};
