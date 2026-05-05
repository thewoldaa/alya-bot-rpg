const { infoEmbed, errorEmbed } = require("../utils/embeds");

module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({
        embeds: [errorEmbed("Command Tidak Ditemukan", "Slash command ini belum terdaftar.")],
        flags: 64
      }).catch(() => {});
    }

    try {
      // Command yang boleh di mana saja
      const freeSlashCommands = new Set(["afkalya", "kickalya", "sb"]);
      if (!freeSlashCommands.has(interaction.commandName) && interaction.guild) {
        const guildSettings = client.db.getGuildSettings(interaction.guild.id);
        if (guildSettings.chat_channel_id && interaction.channel.id !== guildSettings.chat_channel_id) {
          return interaction.reply({
            content: `❌ Command ini hanya bisa dipakai di <#${guildSettings.chat_channel_id}>!`,
            ephemeral: true
          }).catch(() => {});
        }
      }

      await command.executeSlash(interaction, client.db, client.config, client);
    } catch (error) {
      console.error(`Slash command error ${interaction.commandName}:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          embeds: [infoEmbed("Terjadi Kesalahan", "Command gagal diproses.")],
          flags: 64
        }).catch(() => {});
      } else {
        await interaction.reply({
          embeds: [infoEmbed("Terjadi Kesalahan", "Command gagal diproses.")],
          flags: 64
        }).catch(() => {});
      }
    }
  }
};
