const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { isOwner } = require("../../utils/guards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resetserver")
    .setDescription("Reset pengaturan server bot.")
    .addBooleanOption((option) =>
      option.setName("confirm").setDescription("Wajib true untuk reset").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async executeSlash(interaction, db) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        embeds: [errorEmbed("Hanya Server", "Command ini hanya bisa dipakai di server.")],
        flags: 64
      });
    }

    const profile = db.getCoreByDiscordId(interaction.user.id);
    const allowed = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || isOwner(interaction.user.id, profile);
    if (!allowed) {
      return interaction.reply({
        embeds: [errorEmbed("Akses Ditolak", "Kamu tidak punya izin untuk command ini.")],
        flags: 64
      });
    }

    const confirm = interaction.options.getBoolean("confirm", true);
    if (!confirm) {
      return interaction.reply({
        embeds: [errorEmbed("Konfirmasi Diperlukan", "Set `confirm:true` untuk reset server.")],
        flags: 64
      });
    }

    await db.resetGuildSettings(interaction.guildId);

    return interaction.reply({
      embeds: [successEmbed("Server Direset", "Pengaturan server bot sudah dikembalikan ke default.")],
      flags: 64
    });
  }
};
