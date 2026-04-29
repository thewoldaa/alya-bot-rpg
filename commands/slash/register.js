const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { getDefaultLimitForGuild } = require("../../utils/guards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Mendaftarkan akun baru.")
    .addStringOption((option) =>
      option
        .setName("nama")
        .setDescription("Nama profil kamu")
        .setRequired(true)
    )
    .setDMPermission(true),
  async executeSlash(interaction, db) {
    const name = interaction.options.getString("nama", true).trim();

    const existing = db.getCoreByDiscordId(interaction.user.id);
    if (existing) {
      const dmText = [
        `Pendaftaran sudah pernah dilakukan.`,
        `Nama: ${existing.username}`,
        `Core ID: [disembunyikan]`,
        `Backup Code: ${existing.backupCode}`,
        `Simpan kode ini karena bisa dipakai berkali-kali untuk login dari akun lain.`
      ].join("\n");

      try {
        await interaction.user.send({
          embeds: [successEmbed("Backup Code", dmText)]
        });
      } catch {}

      return interaction.reply({
        embeds: [
          successEmbed(
            "Sudah Terdaftar",
            `Kamu sudah terdaftar sebagai **${existing.username}**.\nBackup code dikirim ulang ke DM jika DM kamu aktif.`
          )
        ],
        flags: 64
      });
    }

    const limit = getDefaultLimitForGuild(db, interaction.guildId);
    const profile = await db.registerUser({
      discordId: interaction.user.id,
      username: name,
      limit
    });

    const dmText = [
      `Pendaftaran berhasil.`,
      `Nama: ${profile.username}`,
      `Core ID: [disembunyikan]`,
      `Backup Code: ${profile.backupCode}`,
      `Simpan kode ini karena bisa dipakai berkali-kali untuk login dari akun lain.`
    ].join("\n");

    try {
      await interaction.user.send({
        embeds: [successEmbed("Backup Code", dmText)]
      });
    } catch {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "DM Gagal",
            "Aku tidak bisa mengirim DM. Aktifkan DM dari server ini lalu jalankan `/register` lagi."
          )
        ],
        flags: 64
      });
    }

    return interaction.reply({
      embeds: [
        successEmbed(
          "Register Berhasil",
          "Akun kamu sudah dibuat. Backup code sudah dikirim ke DM."
        )
      ],
      flags: 64
    });
  }
};
