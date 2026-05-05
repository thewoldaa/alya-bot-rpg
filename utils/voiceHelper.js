const { joinVoiceChannel, VoiceConnectionStatus, entersState, getVoiceConnection } = require("@discordjs/voice");

function setupVoiceConnection(connection, channelId, guildId, client) {
  connection.activeChannelId = channelId;

  if (connection.heartbeat) clearInterval(connection.heartbeat);
  connection.heartbeat = setInterval(() => {
    try {
      if (connection.state.status === VoiceConnectionStatus.Ready) {
        connection.setSpeaking(true);
        setTimeout(() => {
          if (connection.state.status === VoiceConnectionStatus.Ready) {
            connection.setSpeaking(false);
          }
        }, 500);
      }
    } catch (e) {
      // Ignore heartbeat errors
    }
  }, 40000);

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch (error) {
      forceVoiceJoin(client, guildId, channelId);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    if (connection.heartbeat) clearInterval(connection.heartbeat);
  });
}

function forceVoiceJoin(client, guildId, channelId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  try {
    const connection = joinVoiceChannel({
      channelId: channelId,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });
    setupVoiceConnection(connection, channelId, guildId, client);
    console.log(`[Voice] Auto-joined persistent channel ${channelId} in ${guildId}`);
  } catch (e) {
    console.error(`[Voice] Failed auto-join in ${guildId}:`, e.message);
  }
}

module.exports = {
  setupVoiceConnection,
  forceVoiceJoin
};
