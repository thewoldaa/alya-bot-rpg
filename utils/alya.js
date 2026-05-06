const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

// Prioritas model berdasarkan kuota user (RPD & RPM tertinggi diutamakan)
const MODELS = [
  "gemma-4-31b-it",      
  "gemma-4-26b-it",      
  "gemini-3.1-flash-lite", 
  "gemini-1.5-flash"     
];
let currentModelIndex = 0;

function getModel() {
  if (!genAI) return null;
  const modelName = MODELS[currentModelIndex];
  
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: "Kamu Alya, anak perempuan 10 tahun yang tengil, imut, dan suka ngeledek. Bicara pake aku/kamu/hehe. Balas chat super singkat. JANGAN pernah kasih penjelasan, pikiran, atau alasan. LANGSUNG jawab chatnya aja.",
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 100,
    }
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
    return "ihh, API key aku belum dipasang masterku 🥺";
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

    // Kirim pesan tanpa format log yang rumit agar model tidak bingung
    const result = await chat.sendMessage(text);
    let responseText = result.response.text();

    if (!responseText) throw new Error("Empty response");

    // Pembersihan AGRESIF untuk membuang template/pikiran model
    // Jika ada baris yang mengandung kata kunci template, kita buang sampai ke baris tersebut
    const lines = responseText.split("\n");
    const cleanedLines = lines.filter(line => {
      const lower = line.toLowerCase();
      return !lower.includes("thought:") && 
             !lower.includes("thinking:") && 
             !lower.includes("constraint") && 
             !lower.includes("character:") && 
             !lower.includes("user:") && 
             !lower.includes("analisis:") &&
             !lower.includes("berpikir:");
    });

    responseText = cleanedLines.join(" ").trim();
    
    // Jika setelah dibersihkan jadi kosong, kasih fallback
    if (!responseText || responseText.length < 2) {
      throw new Error("Response cleaned to empty");
    }

    return responseText;
  } catch (error) {
    console.error(`[AI Error] ${MODELS[currentModelIndex]}: ${error.message}`);

    if (retryCount < MODELS.length) {
      currentModelIndex = (currentModelIndex + 1) % MODELS.length;
      model = getModel();
      chatSessions.delete(userId);
      return getAlyaResponse(userId, text, username, db, retryCount + 1);
    }

    const fallbacks = [
      "Apaaaa? Mau kasih aku uang jajan ya? mwehehe",
      "Ih kenapa panggil-panggil? Kangen yaaa? 😜",
      "Apa sih? Alya lagi sibuk main nih! Hehe",
      "Mwehehe, kamu manggil aku terus deh!"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

module.exports = {
  getAlyaResponse
};
