const { infoEmbed } = require("../utils/embeds");
const { requireRegistered, formatCoreId } = require("../utils/guards");
const { formatInventory, hasHouse, formatPartnerList, formatChildren, formatEquipment } = require("../utils/helpers");
const { money, formatDate } = require("../utils/format");
const { hungerMax } = require("../config");
const { getGearBonuses } = require("../utils/gear");
const { summarizePortfolio } = require("../utils/stockTrade");

module.exports = {
  name: "profil",
  aliases: ["profile"],
  description: "Melihat profil user.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const portfolio = summarizePortfolio(db, profile.portfolio || {});
    const bonuses = getGearBonuses(profile);

    const content = [
      `Nama: **${profile.username}**`,
      `Core ID: \`${formatCoreId(profile.core_id)}\``,
      `Registered: **${profile.registered ? "Ya" : "Tidak"}**`,
      `Level: **${profile.level}**`,
      `XP: **${profile.xp}** / ${db.getXpNeed(profile.level)}`,
      `Uang: **${money(profile.uang)}**`,
      `Limit: **${profile.limit}**`,
      `Job: **${profile.job?.name || "Belum punya"}**`,
      `Hunger: **${Number(profile.hunger ?? hungerMax)}** / ${hungerMax}`,
      `Mood: **${profile.mood || "normal"}**`,
      `Hubungan: **${profile.hubungan}**`,
      `Rumah: **${hasHouse(profile) ? profile.rumah.name : "Tidak punya"}**`,
      `Updated: **${formatDate(profile.updated_at)}**`,
      `Bonus Gear: money +${(bonuses.moneyBonus * 100).toFixed(1)}% | xp +${(bonuses.xpBonus * 100).toFixed(1)}% | hunger -${bonuses.hungerReduction}`,
      `Portfolio: **${money(portfolio.totalValue)}**`,
      "",
      "**Equipment**",
      formatEquipment(profile),
      "",
      "**Pasangan**",
      formatPartnerList(profile),
      "",
      "**Anak**",
      formatChildren(profile),
      "",
      "**Inventory**",
      formatInventory(profile)
    ].join("\n");

    return message.reply({
      embeds: [infoEmbed("Profil", content)]
    });
  }
};
