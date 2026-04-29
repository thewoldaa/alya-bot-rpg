const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("login")
    .setDescription("Menghubungkan akun ini ke shared data.")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("Backup code atau backup ID owner")
        .setRequired(true)
    )
  .setDMPermission(true),
  async executeSlash(interaction, db) {
    const profile = db.getCoreByDiscordId(interaction.user.id);
    if (!profile) {
      return interaction.reply({
        embeds: [errorEmbed("Akun Belum Terdaftar", "Gunakan `/register <nama>` terlebih dahulu.")],
        flags: 64
      });
    }

    const id = interaction.options.getString("id", true).trim();
    const linked = await db.linkAccount({
      discordId: interaction.user.id,
      backupCode: id,
      username: interaction.user.username
    });

    if (!linked) {
      return interaction.reply({
        embeds: [
          errorEmbed("Login Gagal", "ID tidak valid atau belum terdaftar.")
        ],
        flags: 64
      });
    }

    return interaction.reply({
      embeds: [
        successEmbed(
          "Login Berhasil",
          "Akun kamu sudah terhubung ke shared data.\nDetail sensitif disembunyikan."
        )
      ],
      flags: 64
    });
  }
};
