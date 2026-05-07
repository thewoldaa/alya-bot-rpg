const { GoogleGenerativeAI } = require("@google/generative-ai");

// List model untuk rotasi
const GEMINI_MODELS = ["gemini-3.1-pro", "gemini-3-flash-live", "gemma-4-31b-it", "gemini-1.5-flash"];
const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];

function detectProvider(token) {
  if (token.startsWith("AIzaSy")) return "gemini";
  if (token.startsWith("sk-ant-")) return "claude";
  if (token.startsWith("sk-or-")) return "openrouter";
  if (token.startsWith("sk-")) return "openai";
  return "unknown";
}

async function validateToken(token, provider, customUrl = null) {
  try {
    const testMsg = "hi";
    if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(token);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(testMsg);
      return result.response.text() ? true : false;
    }
    if (provider === "openai" || provider === "deepseek" || provider === "openrouter") {
      let baseUrl = "https://api.openai.com/v1/chat/completions";
      if (provider === "deepseek") baseUrl = "https://api.deepseek.com/v1/chat/completions";
      if (provider === "openrouter") baseUrl = "https://openrouter.ai/api/v1/chat/completions";
      if (customUrl) baseUrl = customUrl;

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          model: provider === "deepseek" ? "deepseek-chat" : "gpt-3.5-turbo",
          messages: [{ role: "user", content: testMsg }],
          max_tokens: 5
        })
      });
      return response.ok;
    }
    return false;
  } catch (e) { return false; }
}

/**
 * Kirim pesan chat dengan sistem rotasi model internal per token
 */
async function sendChatRequest(token, provider, customUrl, systemInstruction, text) {
  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(token);
    // Coba rotasi model di dalam token ini
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
          generationConfig: { temperature: 0.2, maxOutputTokens: 50 }
        });
        const result = await model.generateContent(text);
        const resText = result.response.text();
        if (resText) return resText;
      } catch (err) {
        console.error(`[Gemini Rotation] Model ${modelName} gagal: ${err.message}`);
        continue;
      }
    }
    throw new Error("Semua model Gemini di token ini gagal");
  }

  if (provider === "openai" || provider === "deepseek" || provider === "openrouter") {
    let baseUrl = "https://api.openai.com/v1/chat/completions";
    let modelsToTry = OPENAI_MODELS;
    
    if (provider === "deepseek") {
      baseUrl = "https://api.deepseek.com/v1/chat/completions";
      modelsToTry = ["deepseek-chat", "deepseek-coder"];
    }
    if (provider === "openrouter") {
      baseUrl = "https://openrouter.ai/api/v1/chat/completions";
      modelsToTry = ["google/gemini-flash-1.5", "openai/gpt-4o-mini"];
    }
    if (customUrl) baseUrl = customUrl;

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: "system", content: systemInstruction }, { role: "user", content: text }],
            temperature: 0.2,
            max_tokens: 50
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
      } catch (err) {
        console.error(`[OpenAI Rotation] Model ${modelName} gagal: ${err.message}`);
        continue;
      }
    }
    throw new Error("Semua model di token ini gagal");
  }

  if (provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": token, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        system: systemInstruction,
        max_tokens: 50,
        temperature: 0.2,
        messages: [{ role: "user", content: text }]
      })
    });
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const data = await response.json();
    return data.content[0].text;
  }

  throw new Error("Provider tidak didukung");
}

module.exports = {
  detectProvider,
  validateToken,
  sendChatRequest
};
