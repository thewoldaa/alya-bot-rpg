const { SlashCommandBuilder } = require("discord.js");
const { playTTS } = require("../utils/audio");
const { errorEmbed, successEmbed } = require("../utils/embeds");
const LanguageDetect = require("languagedetect");
const lngDetector = new LanguageDetect();

module.exports = {
  name: "say",
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Menyuruh Alya berbicara (membacakan teks dengan suara imut).")
    .addStringOption(option => 
      option.setName("teks")
        .setDescription("Teks yang ingin diucapkan Alya")
        .setRequired(true)
    ),
  async executeSlash(interaction, db) {
    const text = interaction.options.getString("teks", true);
    
    if (text.length > 200) {
      return interaction.reply({ embeds: [errorEmbed("Kepanjangan!", "Napas Alya pendek, maksimal 200 karakter aja ya! 🥺")], ephemeral: true });
    }

    // Deteksi Bahasa Otomatis
    let lang = "id";
    const detected = lngDetector.detect(text, 1);
    if (detected && detected.length > 0) {
      const langName = detected[0][0].toLowerCase();
      // Map common languages to google-tts format
      const langMap = {
        "indonesian": "id",
        "english": "en",
        "japanese": "ja",
        "korean": "ko",
        "spanish": "es",
        "french": "fr"
      };
      lang = langMap[langName] || "id";
    }

    const voiceChannel = interaction.member?.voice?.channel;
    
    // Defer reply karena TTS butuh waktu render
    await interaction.deferReply();

    try {
      const result = await playTTS(interaction.guildId, text, lang, db, voiceChannel);

      if (!result.success) {
        return interaction.editReply({ embeds: [errorEmbed("Gagal", result.message)] });
      }

      return interaction.editReply({ embeds: [successEmbed("🔊 Alya Berbicara", `*${text}*`)] });
    } catch (error) {
      console.error("Say command error:", error);
      return interaction.editReply({ embeds: [errorEmbed("Gagal", "Alya lagi serak, gagal ngomong!")] });
    }
  }
};
