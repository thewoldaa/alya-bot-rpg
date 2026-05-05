const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

module.exports = {
  name: "bank",
  aliases: ["setor", "deposit"],
  description: "Menyimpan uang di bank agar aman dari begal. Ada biaya admin 5%.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (args.length === 0) {
      return message.reply({ embeds: [successEmbed("💳 Info Bank", `Saldo Bank: **${money(profile.bank || 0)}**\nUang Tunai: **${money(profile.uang || 0)}**\n\nUntuk menyetor: \`.bank <jumlah>\` (Pajak 5%)`)] });
    }

    const amountStr = args[0].toLowerCase();
    let amount = 0;

    if (amountStr === "all" || amountStr === "semua") {
      amount = profile.uang || 0;
    } else {
      amount = parseInt(amountStr);
    }

    if (isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Jumlah setoran tidak valid!")] });
    }

    if ((profile.uang || 0) < amount) {
      return message.reply({ embeds: [errorEmbed("Miskin", "Uang tunai kamu nggak cukup buat disetor segitu!")] });
    }

    const fee = Math.floor(amount * 0.05); // 5% fee
    const depositAmount = amount - fee;

    await db.updateCore(profile.core_id, (core) => {
      core.uang -= amount;
      core.bank = (core.bank || 0) + depositAmount;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Setor Tunai Berhasil",
          `Kamu menyetor **${money(amount)}** ke bank.\nPotongan Admin (5%): **${money(fee)}**\nSaldo Bank sekarang: **${money(profile.bank + depositAmount)}**`
        )
      ]
    });
  }
};
