const shopItems = require("./items");
const characters = require("./characters");
const jobs = require("./jobs");
const gearCatalog = require("./gear");

module.exports = {
  prefix: process.env.PREFIX || ".",
  ownerIds: (process.env.OWNER_IDS || "111218344834482").split(",").map((id) => id.trim()).filter(Boolean),
  ownerName: process.env.OWNER_NAME || "Craftkal",
  isOwner: (user) => {
    const ids = (process.env.OWNER_IDS || "111218344834482").split(",").map(id => id.trim());
    return ids.includes(user.id) || user.username?.toLowerCase() === "craftkal";
  },
  defaultUserLimit: Number(process.env.DEFAULT_USER_LIMIT || 10),
  stockIntervalMs: Number(process.env.STOCK_INTERVAL_MS || 60_000),
  marketAlertCooldownMs: Number(process.env.MARKET_ALERT_COOLDOWN_MS || 300_000),
  stockHistoryLimit: Number(process.env.STOCK_HISTORY_LIMIT || 20),
  workCooldownMs: 60_000,
  hungerMax: 100,
  hungerEatAmount: 45,
  spamWindowMs: 1_000,
  spamThreshold: 20,
  spamBlockMs: 5 * 60_000,
  levelXpBase: 100,
  shopItems,
  characters,
  jobs,
  gearCatalog,
  houseCatalog: [
    { key: "kecil", name: "Rumah Kecil", price: 5_000, desc: "Rumah sederhana untuk memulai keluarga." },
    { key: "sedang", name: "Rumah Sedang", price: 25_000, desc: "Rumah nyaman untuk pasangan dan anak." },
    { key: "mewah", name: "Rumah Mewah", price: 100_000, desc: "Rumah premium untuk keluarga besar." }
  ],
  stockCatalog: [
    { symbol: "IRON", name: "Iron", price: 100 },
    { symbol: "GOLD", name: "Gold", price: 250 },
    { symbol: "DIAMOND", name: "Diamond", price: 500 },
    { symbol: "OLD COIN", name: "Old Coin", price: 50 },
    { symbol: "NARS COIN", name: "Nars Coin", price: 1_300 },
    { symbol: "GOD COIN", name: "God Coin", price: 102_381 }
  ]
};
