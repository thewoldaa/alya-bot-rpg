const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { resolveMember } = require("../utils/resolve");
const { money } = require("../utils/format");

module.exports = {
  name: "pay",
  aliases: [],
  description: "Transfer uang ke user lain.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const targetRaw = args[0];
    const amount = Number(args[1]);
    if (!targetRaw || !Number.isFinite(amount) || amount <= 0) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.pay <user> <jumlah>`")]
      });
    }

    const member = await resolveMember(message.guild, targetRaw);
    if (!member || member.user.id === message.author.id) {
      return message.reply({
        embeds: [errorEmbed("Target Tidak Valid", "Pilih user lain yang terdaftar.")]
      });
    }

    const target = db.getCoreByDiscordId(member.user.id);
    if (!target) {
      return message.reply({
        embeds: [errorEmbed("Target Belum Terdaftar", "User tujuan harus sudah register.")]
      });
    }

    if ((profile.uang || 0) < amount) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Saldo kamu hanya ${money(profile.uang)}.`)]
      });
    }

    const transfer = await db.transferMoney(profile.core_id, target.core_id, amount);
    if (!transfer) {
      return message.reply({
        embeds: [errorEmbed("Transfer Gagal", "Saldo tidak cukup atau data target tidak valid.")]
      });
    }

    return message.reply({
      embeds: [
        successEmbed(
          "Transfer Berhasil",
          `Kamu mengirim ${money(amount)} ke <@${member.user.id}>.`
        )
      ]
    });
  }
};
