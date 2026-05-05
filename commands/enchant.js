const { successEmbed, errorEmbed } = require("../utils/embeds");

const { normalizeEquipment, getGearDataByKey, getGearBonuses } = require("../utils/gear");
const { hasInventoryItem } = require("../utils/helpers");
const { money } = require("../utils/format");
const { randInt, chance } = require("../utils/random");

module.exports = {
  name: "enchant",
  aliases: ["ench"],
  description: "Meningkatkan level enchant gear.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const slotInput = String(args[0] || "").toLowerCase().trim();
    if (!slotInput) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.enchant <weapon|armor|accessory>`")]
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
        embeds: [errorEmbed("Kosong", `Slot **${slot}** belum terisi gear.`)]
      });
    }

    const gearData = getGearDataByKey(piece.key);
    if (!gearData) {
      return message.reply({
        embeds: [errorEmbed("Data Gear Hilang", "Gear ini tidak dikenali oleh sistem.")]
      });
    }

    if (!hasInventoryItem(profile, "enchant_stone", 1)) {
      return message.reply({
        embeds: [errorEmbed("Enchant Stone Kurang", "Kamu butuh `enchant_stone` di inventory.")]
      });
    }

    const currentLevel = Number(piece.enchant || 0);
    const cost = 1500 + (currentLevel * 750);
    if (Number(profile.uang || 0) < cost) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Butuh ${money(cost)} untuk enchant.`)]
      });
    }

    const gearBonuses = getGearBonuses(profile);
    const luckBoost = Math.floor(gearBonuses.luckBonus * 100);
    const successChance = Math.max(35, Math.min(97, 90 - (currentLevel * 8) + Math.floor(luckBoost * 0.5)));
    const greatSuccessChance = Math.max(3, Math.min(35, 12 - currentLevel + Math.floor(luckBoost * 0.25)));
    const success = chance(successChance);
    const great = success && chance(greatSuccessChance);
    const failDowngrade = !success && currentLevel >= 5 && chance(35);

    await db.removeInventoryItem(profile.core_id, "enchant_stone", 1);

    const updated = await db.updateCore(profile.core_id, (core) => {
      core.uang = Math.max(0, Number(core.uang || 0) - cost);
      core.equipment = normalizeEquipment(core.equipment);
      const slotPiece = core.equipment[slot];
      if (!slotPiece) return core;

      if (success) {
        slotPiece.enchant = Math.min(Number(gearData.maxEnchant || 999), currentLevel + 1 + (great ? 1 : 0));
      } else if (failDowngrade) {
        slotPiece.enchant = Math.max(0, currentLevel - 1);
      }

      core.equipment[slot] = slotPiece;
      return core;
    });

    const finalPiece = updated.equipment[slot];
    const bonuses = getGearBonuses(updated);

    if (success) {
      return message.reply({
        embeds: [
          successEmbed(
            "Enchant Berhasil",
            `${piece.name} sekarang +${finalPiece.enchant}.\nBiaya: ${money(cost)}\nPeluang sukses: ${successChance}%${great ? `\nGreat success aktif!` : ""}\nBonus gear kamu sekarang: money +${(bonuses.moneyBonus * 100).toFixed(1)}%, xp +${(bonuses.xpBonus * 100).toFixed(1)}%`
          )
        ]
      });
    }

    return message.reply({
      embeds: [
        errorEmbed(
          "Enchant Gagal",
          failDowngrade
            ? `${piece.name} turun ke +${finalPiece.enchant}.\nBiaya: ${money(cost)}`
            : `Enchant gagal tapi gear tetap aman.\nBiaya: ${money(cost)}`
        )
      ]
    });
  }
};
