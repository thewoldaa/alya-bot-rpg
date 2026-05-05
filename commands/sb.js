const { SlashCommandBuilder } = require("discord.js");
const { playSound } = require("../utils/audio");
const { errorEmbed, successEmbed } = require("../utils/embeds");

module.exports = {
  name: "sb",
  data: new SlashCommandBuilder()
    .setName("sb")
    .setDescription("Memutar soundboard melalui Alya.")
    .addStringOption(option => 
      option.setName("nama")
        .setDescription("Nama sound yang ingin diputar")
        .setRequired(true)
    ),
  async executeSlash(interaction, db) {
    const soundName = interaction.options.getString("nama", true);
    
    const result = playSound(interaction.guildId, soundName, db);

    if (!result.success) {
      return interaction.reply({ embeds: [errorEmbed("Gagal", result.message)], ephemeral: true });
    }

    return interaction.reply({ embeds: [successEmbed("Soundboard", result.message)] });
  }
};
