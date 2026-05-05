const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  getVoiceConnection,
  NoSubscriberBehavior 
} = require("@discordjs/voice");
const path = require("path");
const ffmpeg = require("ffmpeg-static");

const players = new Map();

function getOrCreatePlayer(guildId) {
  if (players.has(guildId)) return players.get(guildId);

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });

  player.on("error", (error) => {
    console.error(`Audio Player Error [${guildId}]:`, error.message);
  });

  players.set(guildId, player);
  return player;
}

function playSound(guildId, soundName, db) {
  const soundData = db.state.soundboard[soundName.toLowerCase()];
  if (!soundData) return { success: false, message: "Sound tidak ditemukan!" };

  const connection = getVoiceConnection(guildId);
  if (!connection) return { success: false, message: "Alya nggak ada di Voice Channel! Panggil dulu pakai `.afkalya`" };

  const player = getOrCreatePlayer(guildId);
  const resource = createAudioResource(soundData.path, {
    inlineVolume: true
  });

  player.play(resource);
  connection.subscribe(player);

  return { success: true, message: `Memutar **${soundName}**...` };
}

module.exports = {
  getOrCreatePlayer,
  playSound
};
