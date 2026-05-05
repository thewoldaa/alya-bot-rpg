const { SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel, VoiceConnectionStatus, entersState, getVoiceConnection } = require("@discordjs/voice");
const { successEmbed, errorEmbed } = require("../utils/embeds");

function setupConnection(connection, channelId, guildId, adapterCreator) {
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      console.log(`[Voice] Alya terputus dari ${guildId}, mencoba menyambung kembali...`);
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 10_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 10_000),
      ]);
      // Berhasil menyambung kembali
    } catch (error) {
      console.log(`[Voice] Gagal reconnect otomatis, mencoba join ulang manual...`);
      // Jika benar-benar putus, coba join ulang manual
      try {
        const newConnection = joinVoiceChannel({
          channelId: channelId,
          guildId: guildId,
          adapterCreator: adapterCreator,
          selfDeaf: false,
          selfMute: false
        });
        setupConnection(newConnection, channelId, guildId, adapterCreator);
      } catch (e) {
        console.error("[Voice] Gagal total untuk join ulang:", e);
      }
    }
  });

  // Log status untuk debugging
  connection.on("stateChange", (oldState, newState) => {
    console.log(`[Voice] State changed from ${oldState.status} to ${newState.status}`);
  });
}

module.exports = {
  name: "afkalya",
  aliases: ["afk alya", "joinvoice"],
  data: new SlashCommandBuilder()
    .setName("afkalya")
    .setDescription("Menyuruh Alya untuk join Voice Channel kamu dan stay (AFK) selamanya."),
  async execute({ message }) {
    const channel = message.member?.voice?.channel;
    if (!channel) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu harus berada di Voice Channel dulu biar Alya bisa nyusul!")] });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      
      setupConnection(connection, channel.id, message.guild.id, message.guild.voiceAdapterCreator);
      return message.reply({ embeds: [successEmbed("Alya Join (Permanent)", "Aku udah masuk ke Voice Channel kamu ya! Aku bakal stay di sini selamanya sampai kamu usir pakai `.kickalya`.")] });
    } catch (error) {
      console.error("AFK Voice Error:", error);
      return message.reply({ embeds: [errorEmbed("Error", "Gagal join Voice Channel: " + error.message)] });
    }
  },
  async executeSlash(interaction) {
    const channel = interaction.member?.voice?.channel;
    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed("Gagal", "Kamu harus berada di Voice Channel dulu biar Alya bisa nyusul!")], ephemeral: true });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      
      setupConnection(connection, channel.id, interaction.guildId, interaction.guild.voiceAdapterCreator);
      return interaction.reply({ embeds: [successEmbed("Alya Join (Permanent)", "Aku udah masuk ke Voice Channel kamu ya! Aku bakal stay di sini selamanya sampai kamu usir pakai `/kickalya`.")] });
    } catch (error) {
      console.error("AFK Voice Slash Error:", error);
      return interaction.reply({ embeds: [errorEmbed("Error", "Gagal join Voice Channel: " + error.message)], ephemeral: true });
    }
  }
};
