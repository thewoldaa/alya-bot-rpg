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
      await command.executeSlash(interaction, client.db, client.config);
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
