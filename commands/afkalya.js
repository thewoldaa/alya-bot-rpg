const { SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { setupVoiceConnection } = require("../utils/voiceHelper");

module.exports = {
  name: "afkalya",
  aliases: ["afk alya", "joinvoice"],
  data: new SlashCommandBuilder()
    .setName("afkalya")
    .setDescription("Menyuruh Alya untuk stay di Voice Channel selamanya."),
  async execute({ message, client, db }) {
    const channel = message.member?.voice?.channel;
    if (!channel) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu harus berada di Voice Channel dulu!")] });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      
      setupVoiceConnection(connection, channel.id, message.guild.id, client);
      
      await db.setGuildSettings(message.guild.id, {
        voice_channel_id: channel.id
      });

      return message.reply({ embeds: [successEmbed("Alya Join", "Aku stay di sini ya! Gak bakal keluar sampai di-kick pakai `.kickalya`.")] });
    } catch (error) {
      console.error("AFK Voice Error:", error);
      return message.reply({ embeds: [errorEmbed("Error", "Gagal join: " + error.message)] });
    }
  },
  async executeSlash(interaction, db, config, client) {
    const channel = interaction.member?.voice?.channel;
    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed("Gagal", "Kamu harus berada di Voice Channel dulu!")], ephemeral: true });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      
      setupVoiceConnection(connection, channel.id, interaction.guildId, client);

      await db.setGuildSettings(interaction.guildId, {
        voice_channel_id: channel.id
      });

      return interaction.reply({ embeds: [successEmbed("Alya Join", "Aku stay di sini ya! Gak bakal keluar sampai di-kick pakai `/kickalya`.")] });
    } catch (error) {
      console.error("AFK Voice Slash Error:", error);
      return interaction.reply({ embeds: [errorEmbed("Error", "Gagal join: " + error.message)], ephemeral: true });
    }
  }
};
