const { successEmbed, errorEmbed } = require("../utils/embeds");
const { isOwner } = require("../utils/guards");
const { resolveMember } = require("../utils/resolve");
const { money } = require("../utils/format");

module.exports = {
  name: "addmoney",
  aliases: [],
  description: "Menambah uang user.",
  async execute({ message, args, db }) {
    if (!requireAuthority(message, "Owner")) return;

    const targetRaw = args[0];
    const amount = Number(args[1]);
    if (!targetRaw || !Number.isFinite(amount)) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.addmoney <user> <jumlah>`")]
      });
    }

    const member = message.guild ? await resolveMember(message.guild, targetRaw) : null;
    const targetId = member?.user?.id || message.author.id;
    const targetProfile = db.getCoreByDiscordId(targetId);
    if (!targetProfile) {
      return message.reply({
        embeds: [errorEmbed("Target Belum Terdaftar", "User tujuan harus register dulu.")]
      });
    }

    await db.addMoney(targetProfile.core_id, amount);

    return message.reply({
      embeds: [
        successEmbed(
          "Uang Ditambahkan",
          `${money(amount)} ditambahkan ke <@${targetId}>.`
        )
      ]
    });
  }
};
