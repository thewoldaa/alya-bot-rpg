const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");
const dotenv = require("dotenv");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");

const config = require("./config");
const Database = require("./utils/database");
const { loadCommands } = require("./handler/loadCommands");
const { loadEvents } = require("./handler/loadEvents");
const { setRuntime } = require("./utils/state");

async function ensureEnvFile() {
  const envPath = path.join(__dirname, ".env");
  let existing = "";

  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf8");
  }

  const hasToken = /^(TOKEN|DISCORD_TOKEN)=.+$/m.test(existing);
  if (hasToken) {
    return;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const token = (await rl.question("Masukkan TOKEN BOT: ")).trim();
  rl.close();

  if (!token) {
    throw new Error("TOKEN BOT tidak boleh kosong.");
  }

  const content = existing.trim()
    ? `${existing.trimEnd()}\nTOKEN=${token}\n`
    : `TOKEN=${token}\n`;

  fs.writeFileSync(envPath, content, "utf8");
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

  process.on("unhandledRejection", (error) => {
    console.error("[unhandledRejection]", error);
  });

  process.on("uncaughtException", (error) => {
    console.error("[uncaughtException]", error);
  });

  const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
  let currentToken = token;
  if (!currentToken) {
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
