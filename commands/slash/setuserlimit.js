const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { isOwner } = require("../../utils/guards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setuserlimit")
    .setDescription("Mengatur limit default user untuk server ini.")
    .addIntegerOption((option) =>
      option.setName("limit").setDescription("Limit default").setRequired(true).setMinValue(1).setMaxValue(1000)
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

    const limit = interaction.options.getInteger("limit", true);
    await db.setGuildSettings(interaction.guildId, {
      user_limit: limit
    });

    return interaction.reply({
      embeds: [successEmbed("User Limit Diset", `Default limit user untuk server ini sekarang ${limit}.`)],
      flags: 64
    });
  }
};
