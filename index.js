const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");
const dotenv = require("dotenv");
const nacl = require("tweetnacl");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");

const config = require("./config");
const Database = require("./utils/database");
const { loadCommands } = require("./handler/loadCommands");
const { loadEvents } = require("./handler/loadEvents");
const { setRuntime } = require("./utils/state");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Middleware to capture raw body for Discord signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

async function ensureEnvFile() {
  // Skip interactive prompt for Vercel/Production
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return;
  }
  const envPath = path.join(__dirname, ".env");
  let existing = "";

  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf8");
  }

  const hasToken = /^(TOKEN|DISCORD_TOKEN)=.+$/m.test(existing);
  if (hasToken) {
    return;
  }

  console.warn("TOKEN tidak ditemukan di .env. Pastikan kamu mengatur Environment Variable TOKEN.");
}

async function promptForToken(message) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const token = (await rl.question(message)).trim();
  rl.close();

  if (!token) {
    throw new Error("TOKEN BOT tidak boleh kosong.");
  }

  return token;
}

function writeTokenToEnv(token) {
  const envPath = path.join(__dirname, ".env");
  let existing = "";

  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf8");
  }

  const clean = existing
    .split(/\r?\n/)
    .filter((line) => !/^(TOKEN|DISCORD_TOKEN)=/.test(line))
    .filter(Boolean);

  clean.unshift(`TOKEN=${token}`);
  fs.writeFileSync(envPath, `${clean.join("\n")}\n`, "utf8");
  process.env.TOKEN = token;
  delete process.env.DISCORD_TOKEN;
}

function isInvalidTokenError(error) {
  const code = error?.code;
  const status = error?.status;
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  return code === "TOKEN_INVALID" ||
    code === "TokenInvalid" ||
    code === 4004 ||
    status === 401 ||
    name.includes("tokeninvalid") ||
    message.includes("token invalid") ||
    message.includes("invalid token") ||
    message.includes("unauthorized");
}

async function bootstrap() {
  await ensureEnvFile();
  dotenv.config();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
  });

  const db = new Database(path.join(__dirname, "database", "state.json"));
  await db.init();

  client.config = config;
  client.db = db;
  client.commands = new Collection();
  client.slashCommands = new Collection();
  client.runtime = {
    stockTimer: null,
    readyAt: null,
    pendingActSessions: new Map()
  };

  setRuntime(client.runtime);
  loadCommands(client);
  loadEvents(client);

  // Endpoint for Discord Interactions (Slash Commands)
  app.post("/interactions", (req, res) => {
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");
    const publicKey = process.env.PUBLIC_KEY;

    if (!signature || !timestamp || !publicKey) {
      return res.status(401).end("Missing signature headers or public key");
    }

    const isVerified = nacl.sign.detached.verify(
      Buffer.concat([Buffer.from(timestamp), req.rawBody]),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex")
    );

    if (!isVerified) {
      return res.status(401).end("Invalid request signature");
    }
    
    const body = req.body;
    if (body.type === 1) {
      return res.send({ type: 1 });
    }

    if (body.type === 2) {
      const { name } = body.data;
      const command = client.slashCommands.get(name);
      
      if (command) {
        // Create a mock interaction object for the command handler
        // Note: This is a simplified version. For complex commands, 
        // they might need a more complete interaction object.
        const interaction = {
          commandName: name,
          user: body.member?.user || body.user,
          member: body.member,
          guildId: body.guild_id,
          options: {
            get: (optName) => {
              const opt = body.data.options?.find(o => o.name === optName);
              return opt ? { value: opt.value } : null;
            },
            getString: (n) => body.data.options?.find(o => o.name === n)?.value,
            getInteger: (n) => body.data.options?.find(o => o.name === n)?.value,
            getUser: (n) => {
              const id = body.data.options?.find(o => o.name === n)?.value;
              return body.data.resolved?.users?.[id];
            }
          },
          reply: async (payload) => {
            const content = typeof payload === "string" ? payload : payload.content;
            const embeds = payload.embeds || [];
            return res.status(200).send({
              type: 4,
              data: { content, embeds }
            });
          },
          followUp: async (payload) => {
            // Note: followUp is hard over HTTP without a token-based reply
            console.log("FollowUp requested in serverless mode");
          }
        };

        try {
          await command.executeSlash({ client, interaction, db: client.db });
          return;
        } catch (err) {
          console.error("Slash Command Error:", err);
          return res.status(200).send({
            type: 4,
            data: { content: "Terjadi kesalahan saat menjalankan slash command." }
          });
        }
      }
    }

    res.status(200).send({ type: 4, data: { content: "Interaction received but no handler found." } });
  });

  app.get("/", (req, res) => {
    res.send("Alya RPG Bot is online!");
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  process.on("unhandledRejection", (error) => {
    console.error("[unhandledRejection]", error);
  });

  process.on("uncaughtException", (error) => {
    console.error("[uncaughtException]", error);
  });

  const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
  let currentToken = token;
  if (!currentToken) {
    if (process.env.VERCEL) {
      throw new Error("TOKEN BOT tidak ditemukan di Environment Variables Vercel.");
    }
    currentToken = await promptForToken("Masukkan TOKEN BOT: ");
    writeTokenToEnv(currentToken);
  }

  let attempts = 0;
  while (attempts < 5) {
    try {
      await client.login(currentToken);
      return;
    } catch (error) {
      if (!isInvalidTokenError(error)) {
        throw error;
      }

      attempts += 1;
      console.error("TOKEN tidak valid, minta token baru dari host.");
      currentToken = await promptForToken("TOKEN tidak valid. Masukkan TOKEN BOT baru: ");
      writeTokenToEnv(currentToken);
    }
  }

  throw new Error("Gagal login setelah beberapa percobaan token.");
}

bootstrap().catch((error) => {
  console.error("Gagal menjalankan bot:", error);
  process.exitCode = 1;
});
