const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior 
} = require("@discordjs/voice");
const path = require("path");
const fs = require("fs");

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

function findBestMatch(input, sounds) {
  if (!input) return null;
  const target = input.toLowerCase();
  
  // Exact match first
  if (sounds[target]) return sounds[target];

  // Starts with match
  const startsWith = Object.keys(sounds).find(s => s.startsWith(target) || target.startsWith(s));
  if (startsWith) return sounds[startsWith];

  // Fuzzy (contains)
  const contains = Object.keys(sounds).find(s => s.includes(target) || target.includes(s));
  if (contains) return sounds[contains];

  return null;
}

function playSound(guildId, soundName, db, voiceChannel = null) {
  const sounds = db.state.soundboard;
  const soundData = findBestMatch(soundName, sounds);
  
  if (!soundData) {
    return { success: false, message: `Sound **${soundName}** nggak ketemu! Coba cek \`.listsb\`` };
  }

  // Ensure file exists
  if (!fs.existsSync(soundData.path)) {
    return { success: false, message: "File suaranya hilang dari server 🥺" };
  }

  let connection = getVoiceConnection(guildId);
  
  // Auto-join if provided voiceChannel and not connected
  if (!connection && voiceChannel) {
    try {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
    } catch (e) {
      console.error("Auto-join error:", e);
    }
  }

  if (!connection) {
    return { success: false, message: "Alya nggak ada di Voice Channel! Masuk dulu ke VC terus panggil Alya ya." };
  }

  const player = getOrCreatePlayer(guildId);
  const resource = createAudioResource(soundData.path, {
    inlineVolume: true
  });

  player.play(resource);
  connection.subscribe(player);

  return { success: true, message: `Memutar **${soundData.name}**...` };
}

module.exports = {
  getOrCreatePlayer,
  playSound
};
