const { successEmbed, errorEmbed } = require("../utils/embeds");
const { getDefaultLimitForGuild, formatCoreId } = require("../utils/guards");

module.exports = {
  name: "register",
  aliases: [],
  description: "Mendaftarkan akun baru.",
  async execute({ message, args, db }) {
    const name = args.join(" ").trim();
    if (!name) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.register <nama>`")]
      });
    }

    const existing = db.getCoreByDiscordId(message.author.id);
    if (existing) {
      const dmText = [
        `Pendaftaran sudah pernah dilakukan.`,
        `Nama: ${existing.username}`,
        `Core ID: ${formatCoreId(existing.core_id)}`,
        `Backup Code: ${existing.backupCode}`,
        `Simpan kode ini karena bisa dipakai berkali-kali untuk login dari akun lain.`
      ].join("\n");

      try {
        await message.author.send({
          embeds: [successEmbed("Backup Code", dmText)]
        });
      } catch {}

      return message.reply({
        embeds: [
          successEmbed(
            "Sudah Terdaftar",
            `Kamu sudah terdaftar sebagai **${existing.username}**.\nBackup code dikirim ulang ke DM jika DM kamu aktif.`
          )
        ]
      });
    }

    const limit = getDefaultLimitForGuild(db, message.guildId);
    const profile = await db.registerUser({
      discordId: message.author.id,
      username: name,
      limit
    });

    const dmText = [
      `Pendaftaran berhasil.`,
      `Nama: ${profile.username}`,
      `Core ID: ${formatCoreId(profile.core_id)}`,
      `Backup Code: ${profile.backupCode}`,
      `Simpan kode ini karena bisa dipakai berkali-kali untuk login dari akun lain.`
    ].join("\n");

    try {
      await message.author.send({
        embeds: [successEmbed("Backup Code", dmText)]
      });
    } catch {
      await message.reply({
        embeds: [
          successEmbed(
            "Register Berhasil",
            "Akun kamu sudah dibuat, tapi DM gagal dikirim. Aktifkan DM dari server ini lalu daftar ulang supaya backup code bisa dikirim dengan aman."
          )
        ]
      });
      return;
    }

    return message.reply({
      embeds: [
        successEmbed(
          "Register Berhasil",
          `Akun kamu sudah dibuat. Backup code sudah dikirim ke DM.`
        )
      ]
    });
  }
};
