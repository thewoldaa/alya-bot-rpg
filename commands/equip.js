const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { findGear, normalizeEquipment } = require("../utils/gear");
const { hasInventoryItem } = require("../utils/helpers");

module.exports = {
  name: "equip",
  aliases: [],
  description: "Memakai gear dari inventory.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const query = args.join(" ").trim();
    if (!query) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.equip <nama gear>`")]
      });
    }

    const gear = findGear(query);
    if (!gear) {
      return message.reply({
        embeds: [errorEmbed("Gear Tidak Ditemukan", "Coba pakai nama atau key gear yang ada di `.gear`.")]
      });
    }

    if (!hasInventoryItem(profile, gear.key, 1)) {
      return message.reply({
        embeds: [errorEmbed("Gear Tidak Ada", `Kamu belum punya **${gear.name}** di inventory.`)]
      });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.inventory = Array.isArray(core.inventory) ? core.inventory : [];
      core.equipment = normalizeEquipment(core.equipment);

      const invIndex = core.inventory.findIndex((item) => item.key === gear.key);
      if (invIndex === -1) return core;

      const inventoryItem = core.inventory[invIndex];
      const carriedEnchant = Number(inventoryItem?.gear?.enchant || 0);

      core.inventory[invIndex].qty -= 1;
      if (core.inventory[invIndex].qty <= 0) {
        core.inventory.splice(invIndex, 1);
      }

      if (core.equipment[gear.slot]) {
        core.inventory.push({
          key: core.equipment[gear.slot].key,
          qty: 1,
          gear: core.equipment[gear.slot]
        });
      }

      core.equipment[gear.slot] = {
        key: gear.key,
        name: gear.name,
        slot: gear.slot,
        rarity: gear.rarity,
        enchant: carriedEnchant,
        equippedAt: Date.now()
      };

      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Gear Dipakai",
          `Kamu memakai **${gear.name}** pada slot **${gear.slot}**.`
        )
      ]
    });
  }
};
