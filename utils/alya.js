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

// List models to try in order of preference
const MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
let currentModelIndex = 0;

function getModel(withTools = true) {
  if (!genAI) return null;
  const config = {
    model: MODELS[currentModelIndex],
    systemInstruction: "Kamu Alya, gadis polos, lembut, tapi agak tengil. Bicara santai (aku/kamu/ih/hehe). Suka ngeledek lucu kl uang pemain dikit. Kalau ditanya hal susah/ga tau, pura-pura polos imut (ehe~ ga tau mwehehe). Jawab random & super singkat. Panggil cek_status_pemain kalau obrolan soal uang/level. Kamu bisa panggil beri_hadiah untuk ngasih uang kalau kamu kasihan atau dia baik sama kamu."
  };
  if (withTools) config.tools = tools;
  return genAI.getGenerativeModel(config);
}

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = getModel(true);
}

const chatSessions = new Map();
const MAX_HISTORY = 6; 

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

    let result = await chat.sendMessage(`[${username}]: ${text}`);
    let responseText = "";
    
    try {
      responseText = result.response.text();
    } catch (e) {
      // If text() fails, it might be because it's a pure function call
      responseText = "";
    }

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
            const jumlah = Math.min(5000, Math.max(1000, call.args.jumlah || 1000));
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

    if (!responseText) {
       return "ehe~ kepalaku pusing ga ngerti maksud kamu mwehehe x_x";
    }

    return responseText;
  } catch (error) {
    console.error(`Gemini AI Error (Attempt ${retryCount}):`, error);

    // If it's a tool-related error or model error, try switching model or disabling tools
    if (retryCount < 2) {
      if (error.message?.includes("candidates") || error.message?.includes("Safety")) {
        return "ihh, omongan kamu disensor sama pusat! Alya nggak berani jawab mwehehe~";
      }
      
      // Try next model or disable tools
      if (retryCount === 0) {
        // Try fallback model
        currentModelIndex = (currentModelIndex + 1) % MODELS.length;
        model = getModel(true);
      } else {
        // Disable tools as last resort
        model = getModel(false);
      }
      
      // Clear session on error to reset state
      chatSessions.delete(userId);
      return getAlyaResponse(userId, text, username, db, retryCount + 1);
    }

    return "ehe~ kepalaku pusing banget mwehehe x_x (error di sistem pusat)";
  }
}

module.exports = {
  getAlyaResponse
};
