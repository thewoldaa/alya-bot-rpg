const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { normalizeEquipment } = require("../utils/gear");

module.exports = {
  name: "unequip",
  aliases: ["lepas"],
  description: "Melepas gear dari slot.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const slotInput = String(args[0] || "").toLowerCase().trim();
    if (!slotInput) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.unequip <weapon|armor|accessory>`")]
      });
    }

    const slotMap = {
      weapon: "weapon",
      senjata: "weapon",
      armor: "armor",
      baju: "armor",
      accessory: "accessory",
      acc: "accessory",
      ring: "accessory"
    };

    const slot = slotMap[slotInput];
    if (!slot) {
      return message.reply({
        embeds: [errorEmbed("Slot Tidak Valid", "Pilih weapon, armor, atau accessory.")]
      });
    }

    const equipment = normalizeEquipment(profile.equipment);
    const piece = equipment[slot];
    if (!piece) {
      return message.reply({
        embeds: [errorEmbed("Kosong", `Slot **${slot}** sedang kosong.`)]
      });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.inventory = Array.isArray(core.inventory) ? core.inventory : [];
      core.equipment = normalizeEquipment(core.equipment);
      core.inventory.push({ key: piece.key, qty: 1, gear: piece });
      core.equipment[slot] = null;
      return core;
    });

    return message.reply({
      embeds: [successEmbed("Gear Dilepas", `**${piece.name}** dilepas dari slot **${slot}**.`)]
    });
  }
};
