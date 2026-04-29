const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { isOwner } = require("../../utils/guards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setchat")
    .setDescription("Menetapkan channel chat server untuk notifikasi bot.")
    .addChannelOption((option) =>
      option.setName("channel").setDescription("Channel tujuan").setRequired(true)
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

    const channel = interaction.options.getChannel("channel", true);
    await db.setGuildSettings(interaction.guildId, {
      chat_channel_id: channel.id
    });

    return interaction.reply({
      embeds: [successEmbed("Chat Channel Diset", `Notifikasi server akan dikirim ke <#${channel.id}>.`)],
      flags: 64
    });
  }
};
