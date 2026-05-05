const { getVoiceConnection, joinVoiceChannel } = require("@discordjs/voice");

module.exports = {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    // Jika yang berubah bukan bot itu sendiri, abaikan
    if (newState.id !== client.user.id) return;

    // Jika bot terputus (newState.channelId === null)
    if (!newState.channelId && oldState.channelId) {
      console.log(`[VoiceGuard] Alya terputus dari ${oldState.channelId}. Memeriksa apakah ini disengaja...`);
      
      // Tunggu sebentar untuk memastikan bukan reconnect otomatis
      setTimeout(() => {
        const connection = getVoiceConnection(oldState.guild.id);
        if (!connection) {
          console.log(`[VoiceGuard] Alya benar-benar hilang. Mencoba masuk kembali ke ${oldState.channelId}...`);
          try {
            joinVoiceChannel({
              channelId: oldState.channelId,
              guildId: oldState.guild.id,
              adapterCreator: oldState.guild.voiceAdapterCreator,
              selfDeaf: false,
              selfMute: false
            });
          } catch (e) {
            console.error("[VoiceGuard] Gagal masuk kembali:", e);
          }
        }
      }, 3000);
    }
  }
};
