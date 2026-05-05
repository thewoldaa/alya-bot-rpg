const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

module.exports = {
  name: "tarik",
  aliases: ["withdraw"],
  description: "Menarik uang dari bank ke uang tunai.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (args.length === 0) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Sebutkan jumlah yang ingin ditarik!\nContoh: `.tarik 5000` atau `.tarik all`")] });
    }

    const amountStr = args[0].toLowerCase();
    let amount = 0;

    if (amountStr === "all" || amountStr === "semua") {
      amount = profile.bank || 0;
    } else {
      amount = parseInt(amountStr);
    }

    if (isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Jumlah penarikan tidak valid!")] });
    }

    if ((profile.bank || 0) < amount) {
      return message.reply({ embeds: [errorEmbed("Saldo Kurang", "Saldo bank kamu nggak cukup buat ditarik segitu!")] });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.bank -= amount;
      core.uang = (core.uang || 0) + amount;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Tarik Tunai Berhasil",
          `Kamu menarik **${money(amount)}** dari bank.\nUang Tunai sekarang: **${money(profile.uang + amount)}**`
        )
      ]
    });
  }
};
