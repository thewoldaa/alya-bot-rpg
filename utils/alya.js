const { sendChatRequest } = require("./aiProviders");

const SYSTEM_INSTRUCTION = "Kamu adalah Alya, gadis 10 tahun yang tengil dan imut. Bicara pake aku/kamu/hehe. JANGAN PERNAH berpikir atau menganalisis. JAWAB LANGSUNG dengan satu kalimat pendek.";

/**
 * Pembersih Teks Agresif
 */
function cleanResponse(responseText) {
  if (!responseText) return "";
  const lines = responseText.split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && 
                !l.toLowerCase().includes("thought") && 
                !l.toLowerCase().includes("analisis") && 
                !l.toLowerCase().includes("constraint") && 
                !l.toLowerCase().includes("character:"));

  const finalStr = lines.length > 0 ? lines[lines.length - 1] : "";
  return finalStr.replace(/^(")|(")$/g, ""); // Hilangkan kutip jika ada
}

async function getAlyaResponse(userId, text, username = "Seseorang", db = null, retryCount = 0) {
  // 1. Kumpulkan semua token yang tersedia (Env utama + Donasi DB)
  const tokenPool = [];
  
  if (process.env.GEMINI_API_KEY) {
    tokenPool.push({
      token: process.env.GEMINI_API_KEY,
      provider: "gemini"
    });
  }

  if (db && db.state.ai_tokens && db.state.ai_tokens.length > 0) {
    db.state.ai_tokens.forEach(t => {
      tokenPool.push({
        token: t.token,
        provider: t.provider
      });
    });
  }

  if (tokenPool.length === 0) {
    return "ihh, master belum pasang API key sama sekali 🥺";
  }

  // Coba satu per satu token di pool
  for (const currentProvider of tokenPool) {
    try {
      // Sekarang sendChatRequest sudah otomatis melakukan rotasi model di dalamnya
      const rawResponse = await sendChatRequest(
        currentProvider.token, 
        currentProvider.provider, 
        null, 
        SYSTEM_INSTRUCTION, 
        text
      );

      const cleaned = cleanResponse(rawResponse);
      if (cleaned.length > 1) {
        return cleaned; 
      }
    } catch (error) {
      console.error(`[Router Error] Token ${currentProvider.provider} gagal total:`, error.message);
      continue; // Coba token berikutnya di pool
    }
  }

  // Jika semua token (dan semua model di dalamnya) gagal
  const fallbacks = [
    "Apaaaa? mwehehe~",
    "Ih kenapa kangen ya? 😜",
    "Alya pusing banyak kerjaan! Hehe",
    "Mwehehe, ada apa panggil Alya?"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = {
  getAlyaResponse
};
