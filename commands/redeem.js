const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { money } = require("../utils/format");

module.exports = {
  name: "redeem",
  aliases: [],
  description: "Menukar kode redeem.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const code = args[0];
    if (!code) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.redeem <kode>`")]
      });
    }

    const redeem = db.getRedeemCode(code);
    if (!redeem) {
      return message.reply({
        embeds: [errorEmbed("Kode Tidak Ditemukan", "Redeem code tidak valid.")]
      });
    }

    if (redeem.claimedBy) {
      return message.reply({
        embeds: [errorEmbed("Sudah Dipakai", "Redeem code ini sudah pernah diklaim.")]
      });
    }

    await db.claimRedeemCode(code, message.author.id);

    const reward = redeem.reward || {};
    if (reward.type === "money") {
      await db.addMoney(profile.core_id, Number(reward.value || 0));
    } else if (reward.type === "limit") {
      await db.updateCore(profile.core_id, (core) => {
        core.limit = Number(core.limit || 0) + Number(reward.value || 0);
        return core;
      });
    } else if (reward.type === "item") {
      await db.addInventoryItem(profile.core_id, reward.itemKey, Number(reward.value || 1));
    }

    const rewardText = reward.type === "money"
      ? money(reward.value)
      : reward.type === "limit"
        ? `${reward.value} limit`
        : `${reward.itemKey} x${reward.value}`;

    return message.reply({
      embeds: [successEmbed("Redeem Berhasil", `Kamu mendapatkan ${rewardText}.`)]
    });
  }
};
