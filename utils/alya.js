const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

// Prioritas model berdasarkan kuota user
const MODELS = [
  "gemini-3.1-pro",
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
    systemInstruction: "Kamu adalah Alya, gadis 10 tahun yang tengil dan imut. Bicara pake aku/kamu/hehe. JANGAN PERNAH berpikir atau menganalisis. JAWAB LANGSUNG dengan satu kalimat pendek.",
    generationConfig: {
      temperature: 0.2, 
      topP: 0.1,
      maxOutputTokens: 50,
      stopSequences: ["Thought:", "Thinking:", "Analisis:", "Character:", "Constraint:", "User:"]
    }
  });
}

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = getModel();
}

async function getAlyaResponse(userId, text, username = "Seseorang", db = null, retryCount = 0) {
  if (!model) {
    return "ihh, API key aku belum dipasang masterku 🥺";
  }

  try {
    // Selalu buat sesi chat baru untuk menghindari AI terjebak dalam template/loop history
    const chat = model.startChat({ history: [] });

    // Gunakan prompt yang sangat direct
    const result = await chat.sendMessage(text);
    let responseText = result.response.text();

    if (!responseText) throw new Error("Empty response");

    // Pembersihan TOTAL
    // Ambil hanya baris terakhir yang tidak kosong (biasanya jawaban ada di paling bawah)
    const lines = responseText.split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0 && 
                  !l.toLowerCase().includes("thought") && 
                  !l.toLowerCase().includes("analisis") && 
                  !l.toLowerCase().includes("constraint") && 
                  !l.toLowerCase().includes("character:"));

    // Jika ada banyak baris, ambil yang paling bawah karena itu biasanya balasannya
    responseText = lines.length > 0 ? lines[lines.length - 1] : "";
    
    if (!responseText || responseText.length < 1) {
      throw new Error("Response cleaned to empty");
    }

    return responseText;
  } catch (error) {
    console.error(`[AI Error] ${MODELS[currentModelIndex]}: ${error.message}`);

    if (retryCount < MODELS.length) {
      currentModelIndex = (currentModelIndex + 1) % MODELS.length;
      model = getModel();
      return getAlyaResponse(userId, text, username, db, retryCount + 1);
    }

    const fallbacks = [
      "Apaaaa? mwehehe~",
      "Ih kenapa kangen ya? 😜",
      "Apa sih? Alya lagi main! Hehe",
      "Mwehehe, ada apa panggil Alya?"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

module.exports = {
  getAlyaResponse
};
