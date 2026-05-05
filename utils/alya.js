const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

const tools = [
  {
    functionDeclarations: [
      {
        name: "cek_status_pemain",
        description: "Gunakan ini untuk mengecek uang, level, dan status karakter RPG pemain saat ini.",
        parameters: {
          type: "OBJECT",
          properties: {},
          required: []
        }
      },
      {
        name: "beri_hadiah",
        description: "Gunakan ini untuk memberikan hadiah uang kejutan (1000 - 5000) ke pemain jika kamu merasa baik/kasihan.",
        parameters: {
          type: "OBJECT",
          properties: {
            jumlah: { type: "INTEGER", description: "Jumlah uang yang diberikan (1000-5000)" }
          },
          required: ["jumlah"]
        }
      }
    ]
  }
];

// Initialize Gemini
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "Kamu Alya, gadis polos, lembut, tapi agak tengil. Bicara santai (aku/kamu/ih/hehe). Suka ngeledek lucu kl uang pemain dikit. Kalau ditanya hal susah/ga tau, pura-pura polos imut (ehe~ ga tau mwehehe). Jawab random & super singkat. Panggil cek_status_pemain kalau obrolan soal uang/level. Kamu bisa panggil beri_hadiah untuk ngasih uang kalau kamu kasihan atau dia baik sama kamu.",
    tools: tools
  });
}

const chatSessions = new Map();
const MAX_HISTORY = 6; // Keep last 3 turns (user+model pairs)

async function getAlyaResponse(userId, text, username = "Seseorang", db = null) {
  if (!model) {
    return "ihh, API key aku belum dipasang sama masterku 🥺";
  }

  try {
    let chat = chatSessions.get(userId);
    
    if (!chat) {
      chat = model.startChat({ history: [] });
      chatSessions.set(userId, chat);
    }

    // Trim history to save tokens
    const currentHistory = await chat.getHistory();
    if (currentHistory.length > MAX_HISTORY) {
      chat = model.startChat({ history: currentHistory.slice(currentHistory.length - MAX_HISTORY) });
      chatSessions.set(userId, chat);
    }

    let result = await chat.sendMessage(`[${username}]: ${text}`);
    let responseText = result.response.text();

    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "cek_status_pemain") {
        let stats = "Belum punya profil RPG.";
        if (db) {
          const profile = db.getCoreByDiscordId(userId);
          if (profile) {
            stats = `Uang: ${profile.uang}, Level: ${profile.level}, Lapar: ${profile.hunger}`;
          }
        }
        
        result = await chat.sendMessage([{
          functionResponse: {
            name: "cek_status_pemain",
            response: { stats }
          }
        }]);
        responseText = result.response.text();
      } else if (call.name === "beri_hadiah") {
        let msg = "Gagal memberi hadiah.";
        if (db) {
          const profile = db.getCoreByDiscordId(userId);
          if (profile) {
            const jumlah = call.args.jumlah || 1000;
            await db.updateCore(profile.core_id, (core) => {
              core.uang = (core.uang || 0) + jumlah;
              return core;
            });
            msg = `Berhasil memberi ${jumlah} uang.`;
          }
        }
        result = await chat.sendMessage([{
          functionResponse: {
            name: "beri_hadiah",
            response: { msg }
          }
        }]);
        responseText = result.response.text();
      }
    }

    return responseText;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "ehe~ kepalaku pusing ga ngerti maksud kamu mwehehe x_x";
  }
}

module.exports = {
  getAlyaResponse
};
