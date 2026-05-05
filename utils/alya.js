const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

// Prioritas model berdasarkan kuota user (RPD & RPM tertinggi diutamakan)
const MODELS = [
  "gemma-4-31b-it",      // 15 RPM, 1500 RPD
  "gemma-4-26b-it",      // 15 RPM, 1500 RPD
  "gemini-3.1-flash-lite", // 15 RPM, 500 RPD
  "gemini-3-flash",      // 5 RPM, 20 RPD (Cadangan)
  "gemini-2.5-flash-lite", // 10 RPM, 20 RPD (Cadangan)
  "gemini-1.5-flash"     // Fallback terakhir
];
let currentModelIndex = 0;

function getModel() {
  if (!genAI) return null;
  const modelName = MODELS[currentModelIndex];
  console.log(`[AI System] Inisialisasi model: ${modelName}`);
  
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: `Kamu adalah Alya, gadis 10 tahun yang polos tapi tengil. 
ATURAN WAJIB:
1. HANYA keluarkan balasan chat saja. 
2. JANGAN pernah mengeluarkan 'Thought', 'Reasoning', 'Analisis', atau template berpikir lainnya.
3. Gaya bicara: santai, singkat, pake 'aku/kamu/ih/hehe/mwehehe'.
4. Karakter: Suka ngeledek (terutama kalau pemain miskin), kalau bingung pura-pura bego/imut.
5. JANGAN gunakan markdown berlebihan, cukup teks biasa yang imut.`
  });
}

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = getModel();
}

const chatSessions = new Map();
const MAX_HISTORY = 4; 

async function getAlyaResponse(userId, text, username = "Seseorang", db = null, retryCount = 0) {
  if (!model) {
    return "ihh, API key aku belum dipasang sama masterku 🥺";
  }

  try {
    let chat = chatSessions.get(userId);
    
    if (!chat) {
      chat = model.startChat({ history: [] });
      chatSessions.set(userId, chat);
    }

    const currentHistory = await chat.getHistory();
    if (currentHistory.length > MAX_HISTORY) {
      chat = model.startChat({ history: currentHistory.slice(currentHistory.length - MAX_HISTORY) });
      chatSessions.set(userId, chat);
    }

    const result = await chat.sendMessage(`[${username}]: ${text}`);
    let responseText = result.response.text();

    if (!responseText) throw new Error("Empty response");

    // Bersihkan jika model bandel ngasih Thought atau Reasoning
    responseText = responseText.replace(/^(Thought|Thinking|Reasoning|Analisis|Proses|Balasan|Response):/gi, "").trim();
    responseText = responseText.replace(/^(Alya|Alya Bot):/gi, "").trim();

    return responseText;
  } catch (error) {
    console.error(`[AI Error] ${MODELS[currentModelIndex]}: ${error.message}`);

    if (retryCount < MODELS.length) {
      // Rotasi ke model berikutnya
      currentModelIndex = (currentModelIndex + 1) % MODELS.length;
      model = getModel();
      
      // Hapus sesi lama agar tidak konflik
      chatSessions.delete(userId);
      return getAlyaResponse(userId, text, username, db, retryCount + 1);
    }

    const fallbacks = [
      "ehe~ Alya lagi bengong mwehehe..",
      "uhh.. kepalaku pusing sebentar, tapi Alya sayang kamu! 🌸",
      "mwehehe~ Alya nggak denger, coba ulang lagi!",
      "ihh kamu ngomong apa? Alya jadi bingung! ✨"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

module.exports = {
  getAlyaResponse
};
