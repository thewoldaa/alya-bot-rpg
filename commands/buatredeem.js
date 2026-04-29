const { successEmbed, errorEmbed } = require("../utils/embeds");
const { isOwner } = require("../utils/guards");

module.exports = {
  name: "buatredeem",
  aliases: ["buatredem", "buatredeem"],
  description: "Membuat kode redeem.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!isOwner(message.author.id, profile)) {
      return message.reply({
        embeds: [errorEmbed("Akses Ditolak", "Command ini khusus owner.")]
      });
    }

    const type = (args[0] || "").toLowerCase();
    if (!type) {
      return message.reply({
        embeds: [
          errorEmbed(
            "Format Salah",
            "Gunakan `.buatredeem money <jumlah> [kode]`, `.buatredeem limit <jumlah> [kode]`, atau `.buatredeem item <itemKey> <jumlah> [kode]`"
          )
        ]
      });
    }

    let reward = null;
    let code = null;

    if (type === "money" || type === "limit") {
      const value = Number(args[1]);
      code = args[2];
      if (!Number.isFinite(value) || value <= 0) {
        return message.reply({
          embeds: [errorEmbed("Nilai Tidak Valid", "Jumlah harus angka positif.")]
        });
      }
      reward = { type, value };
    } else if (type === "item") {
      const itemKey = args[1];
      const value = Number(args[2] || 1);
      code = args[3];
      if (!itemKey || !Number.isFinite(value) || value <= 0) {
        return message.reply({
          embeds: [errorEmbed("Format Salah", "Gunakan `.buatredeem item <itemKey> <jumlah> [kode]`")]
        });
      }
      reward = { type, itemKey, value };
    } else {
      return message.reply({
        embeds: [errorEmbed("Tipe Tidak Dikenal", "Pilih money, limit, atau item.")]
      });
    }

    if (code && db.getRedeemCode(code)) {
      return message.reply({
        embeds: [errorEmbed("Kode Sudah Dipakai", "Gunakan kode lain.")]
      });
    }

    const created = await db.createRedeemCode(reward, code);

    return message.reply({
      embeds: [successEmbed("Redeem Dibuat", `Kode: \`${created.code}\``)]
    });
  }
};
