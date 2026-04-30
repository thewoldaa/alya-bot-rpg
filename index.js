// Railway Deployment - Version 2.0 (Clean Version)
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const dotenv = require("dotenv");
const express = require("express");

const config = require("./config");
const Database = require("./utils/database");
const { loadCommands } = require("./handler/loadCommands");
const { loadEvents } = require("./handler/loadEvents");
const { setRuntime } = require("./utils/state");

// Load Environment Variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

async function bootstrap() {
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

  // Database Initialization
  const dbPath = path.join(__dirname, "database", "state.json");
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  
  const db = new Database(dbPath);
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
  
  // Load Handlers
  loadCommands(client);
  loadEvents(client);

  // Health check for Railway
  app.get("/", (req, res) => {
    res.send("Alya RPG Bot is Running on Railway!");
  });

  app.listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });

  // Error Handling
  process.on("unhandledRejection", (error) => {
    console.error("[unhandledRejection]", error);
  });

  process.on("uncaughtException", (error) => {
    console.error("[uncaughtException]", error);
  });

  // Login
  let token = process.env.TOKEN || process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("ERROR: TOKEN tidak ditemukan di Environment Variables!");
    process.exit(1);
  }

  // Bersihkan token dari spasi atau karakter aneh
  token = token.trim().replace(/['"]/g, ""); 
  
  console.log(`Menghubungkan ke Discord... (Token Length: ${token.length})`);

  try {
    await client.login(token);
  } catch (error) {
    console.error("Gagal login ke Discord:", error);
    process.exit(1);
  }
}

bootstrap();
