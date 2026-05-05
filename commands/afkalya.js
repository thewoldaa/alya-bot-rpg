const { SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const { successEmbed, errorEmbed } = require("../utils/embeds");

function setupConnection(connection) {
  connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Seems to be reconnecting to a new channel - ignore disconnect
    } catch (error) {
      // Seems to be a real disconnect which shouldn't be recovered from
      connection.destroy();
    }
  });
}

module.exports = {
  name: "afkalya",
  aliases: ["afk alya", "joinvoice"],
  data: new SlashCommandBuilder()
    .setName("afkalya")
    .setDescription("Menyuruh Alya untuk join Voice Channel kamu dan stay (AFK)."),
  async execute({ message }) {
    if (!message.member.voice.channel) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu harus berada di Voice Channel dulu biar Alya bisa nyusul!")] });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      setupConnection(connection);

      return message.reply({ embeds: [successEmbed("Alya Join", "Aku udah masuk ke Voice Channel kamu ya! Bakal diam di sini sampai kamu suruh `/kickalya`")] });
    } catch (error) {
      console.error(error);
      return message.reply({ embeds: [errorEmbed("Error", "Gagal join Voice Channel.")] });
    }
  },
  async executeSlash({ interaction }) {
    if (!interaction.member.voice.channel) {
      return interaction.reply({ embeds: [errorEmbed("Gagal", "Kamu harus berada di Voice Channel dulu biar Alya bisa nyusul!")], ephemeral: true });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      setupConnection(connection);

      return interaction.reply({ embeds: [successEmbed("Alya Join", "Aku udah masuk ke Voice Channel kamu ya! Bakal diam di sini sampai kamu suruh `/kickalya`")] });
    } catch (error) {
      console.error(error);
      return interaction.reply({ embeds: [errorEmbed("Error", "Gagal join Voice Channel.")], ephemeral: true });
    }
  }
};
