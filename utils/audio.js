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
const googleTTS = require("google-tts-api");
const ffmpeg = require("ffmpeg-static");
const { spawn } = require("child_process");

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

async function playTTS(guildId, text, lang = "id", db, voiceChannel = null) {
  let connection = getVoiceConnection(guildId);
  
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

  try {
    // Dapatkan URL audio dari Google TTS
    const url = googleTTS.getAudioUrl(text, {
      lang: lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    // Gunakan ffmpeg untuk pitch shift (suara anak kecil / chipmunk)
    // -f opus langsung di-encode ke OggOpus untuk Discord.js
    const ffmpegProcess = spawn(ffmpeg, [
      '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      '-i', url,
      '-af', 'asetrate=44100*1.15,aresample=44100,atempo=1/1.15',
      '-f', 'opus',
      'pipe:1'
    ]);

    const player = getOrCreatePlayer(guildId);
    
    // Gunakan output ffmpeg langsung sebagai audio resource berformat OggOpus
    const resource = createAudioResource(ffmpegProcess.stdout, {
      inputType: require("@discordjs/voice").StreamType.OggOpus
    });

    player.play(resource);
    connection.subscribe(player);

    return { success: true, message: "Berhasil" };
  } catch (error) {
    console.error("TTS Error:", error);
    return { success: false, message: "Gagal memproses suara TTS." };
  }
}

module.exports = {
  getOrCreatePlayer,
  playSound,
  playTTS
};
