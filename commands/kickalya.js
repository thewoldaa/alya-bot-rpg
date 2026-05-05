const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { successEmbed, errorEmbed } = require("../utils/embeds");

module.exports = {
  name: "kickalya",
  aliases: ["kick alya", "leavevoice"],
  data: new SlashCommandBuilder()
    .setName("kickalya")
    .setDescription("Menyuruh Alya untuk keluar dari Voice Channel."),
  async execute({ message, db }) {
    const connection = getVoiceConnection(message.guild.id);

    if (!connection) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Alya lagi nggak ada di Voice Channel mana-mana kok.")] });
    }

    try {
      if (connection.heartbeat) clearInterval(connection.heartbeat);
      connection.destroy();
      
      // Hapus dari database agar tidak auto-join lagi
      await db.setGuildSettings(message.guild.id, {
        voice_channel_id: null
      });

      return message.reply({ embeds: [successEmbed("Alya Keluar", "Aku udah keluar dari Voice Channel ya! Dadah~")] });
    } catch (error) {
      console.error(error);
      return message.reply({ embeds: [errorEmbed("Error", "Gagal keluar dari Voice Channel.")] });
    }
  },
  async executeSlash(interaction, db) {
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return interaction.reply({ embeds: [errorEmbed("Gagal", "Alya lagi nggak ada di Voice Channel mana-mana kok.")], ephemeral: true });
    }

    try {
      if (connection.heartbeat) clearInterval(connection.heartbeat);
      connection.destroy();

      // Hapus dari database agar tidak auto-join lagi
      await db.setGuildSettings(interaction.guildId, {
        voice_channel_id: null
      });

      return interaction.reply({ embeds: [successEmbed("Alya Keluar", "Aku udah keluar dari Voice Channel ya! Dadah~")] });
    } catch (error) {
      console.error(error);
      return interaction.reply({ embeds: [errorEmbed("Error", "Gagal keluar dari Voice Channel.")], ephemeral: true });
    }
  }
};
