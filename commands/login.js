const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");

module.exports = {
  name: "login",
  aliases: [],
  description: "Menghubungkan akun lain ke data yang sama.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const backupCode = args.join(" ").trim();
    if (!backupCode) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `/login <id>`")]
      });
    }

    const linked = await db.linkAccount({
      discordId: message.author.id,
      backupCode,
      username: message.author.username
    });

    if (!linked) {
      return message.reply({
        embeds: [errorEmbed("Login Gagal", "ID tidak valid atau belum terdaftar.")]
      });
    }

    return message.reply({
      embeds: [
        successEmbed(
          "Login Berhasil",
          "Akun ini sekarang terhubung ke shared data.\nGunakan `/login <id>` untuk versi yang lebih aman."
        )
      ]
    });
  }
};
