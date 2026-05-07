const { SlashCommandBuilder } = require("discord.js");
const { detectProvider, validateToken } = require("../utils/aiProviders");
const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");

module.exports = {
  name: "addtoken",
  data: new SlashCommandBuilder()
    .setName("addtoken")
    .setDescription("Menyumbangkan API Key untuk Alya (Mendukung Gemini, GPT, Claude, DeepSeek, dll).")
    .addStringOption(option => 
      option.setName("token")
        .setDescription("API Key yang ingin disumbangkan")
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName("provider")
        .setDescription("Opsional: Provider (gemini/openai/claude/deepseek/openrouter)")
        .setRequired(false)
        .addChoices(
          { name: "Gemini", value: "gemini" },
          { name: "OpenAI", value: "openai" },
          { name: "Claude", value: "claude" },
          { name: "DeepSeek", value: "deepseek" },
          { name: "OpenRouter", value: "openrouter" }
        )
    ),
  async executeSlash(interaction, db) {
    const token = interaction.options.getString("token", true);
    let provider = interaction.options.getString("provider");

    // Deteksi otomatis jika provider tidak diisi
    if (!provider) {
      provider = detectProvider(token);
    }

    if (provider === "unknown") {
      return interaction.reply({ 
        embeds: [errorEmbed("Gagal", "Sistem tidak mengenali format token ini. Mohon isi kolom `provider` secara manual saat memanggil command.")], 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true }); // Biar rahasia

    try {
      // Validasi Token
      const isValid = await validateToken(token, provider);

      if (!isValid) {
        return interaction.editReply({ 
          embeds: [errorEmbed("Token Invalid", "Token ini tidak berfungsi atau sudah kehabisan saldo (limit).")] 
        });
      }

      // Pastikan ai_tokens ada di database
      if (!db.state.ai_tokens) db.state.ai_tokens = [];

      // Cek duplikat
      const existing = db.state.ai_tokens.find(t => t.token === token);
      if (existing) {
        return interaction.editReply({ 
          embeds: [infoEmbed("Sudah Ada", "Token ini sudah pernah disumbangkan sebelumnya. Terima kasih!")] 
        });
      }

      // Simpan ke database
      db.state.ai_tokens.push({
        token: token,
        provider: provider,
        addedBy: interaction.user.id,
        addedAt: Date.now()
      });

      // Beri notifikasi sukses
      return interaction.editReply({ 
        embeds: [successEmbed("Terima Kasih! 🎉", `Token **${provider.toUpperCase()}** berhasil divalidasi dan ditambahkan ke dalam otak Alya. Sekarang Alya punya lebih banyak energi untuk membalas chat! \n*(Token disembunyikan untuk keamanan)*`)] 
      });

    } catch (error) {
      console.error("Addtoken Error:", error);
      return interaction.editReply({ 
        embeds: [errorEmbed("Error", "Terjadi kesalahan sistem saat memvalidasi token.")] 
      });
    }
  }
};
