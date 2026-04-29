const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");

const recipes = {
  "enchant_stone": {
    name: "Enchant Stone",
    materials: { potion: 3, food: 1 }
  },
  "ticket": {
    name: "Lucky Ticket",
    materials: { potion: 2, food: 2 }
  },
  "lucky_ring": {
    name: "Lucky Ring",
    materials: { enchant_stone: 5 }
  }
};

module.exports = {
  name: "craft",
  aliases: ["tempa"],
  description: "Membuat item spesifik dari material yang kamu kumpulkan.",
  async execute({ message, args, db, config }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const itemQuery = args[0]?.toLowerCase();

    if (!itemQuery || !recipes[itemQuery]) {
      const recipeList = Object.entries(recipes).map(([key, data]) => {
        const mats = Object.entries(data.materials).map(([mKey, mQty]) => `${mQty}x ${mKey}`).join(", ");
        return `**${key}** -> Butuh: ${mats}`;
      }).join("\n");

      return message.reply({
        embeds: [infoEmbed("Daftar Crafting", `Gunakan \`.craft <nama_item>\`\n\nResep Tersedia:\n${recipeList}`)]
      });
    }

    const recipe = recipes[itemQuery];
    const inventory = profile.inventory || [];

    // Check materials
    for (const [matKey, reqQty] of Object.entries(recipe.materials)) {
      const invItem = inventory.find(i => i.key === matKey);
      if (!invItem || invItem.qty < reqQty) {
        return message.reply({
          embeds: [errorEmbed("Material Kurang", `Kamu kekurangan **${matKey}**. Butuh ${reqQty}x.`)]
        });
      }
    }

    // Consume materials
    for (const [matKey, reqQty] of Object.entries(recipe.materials)) {
      await db.removeInventoryItem(profile.core_id, matKey, reqQty);
    }

    // Give crafted item
    await db.addInventoryItem(profile.core_id, itemQuery, 1);

    return message.reply({
      embeds: [
        successEmbed(
          "Crafting Berhasil! 🔨",
          `Kamu telah berhasil menempa **${recipe.name}**!\nCek \`.inv\` untuk melihat item barumu.`
        )
      ]
    });
  }
};
