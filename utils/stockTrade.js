const { stockCatalog } = require("../config");
const { money } = require("./format");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function renderStocks(db) {
  return db.getStocks()
    .map((stock, index) => {
      const diff = Number(stock.lastChange || 0);
      return `${index + 1}. **${stock.symbol}**: ${money(stock.price)} (${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%)`;
    })
    .join("\n");
}

function summarizePortfolio(db, portfolio) {
  const entries = Object.entries(portfolio || {});
  if (!entries.length) {
    return {
      totalValue: 0,
      lines: ["Belum punya saham."]
    };
  }

  let totalValue = 0;
  const lines = entries.map(([symbol, qty]) => {
    const stock = db.getStock(symbol);
    const quantity = Number(qty || 0);
    const price = Number(stock?.price || 0);
    const value = price * quantity;
    totalValue += value;

    const diff = Number(stock?.lastChange || 0);
    return `- **${symbol}** x${quantity} | ${money(price)} | ${money(value)} (${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%)`;
  });

  return {
    totalValue,
    lines
  };
}

function resolveStock(db, query) {
  const input = String(query || "").trim();
  if (!input) return null;

  if (/^\d+$/.test(input)) {
    const index = Number(input);
    const shortcut = stockCatalog[index - 1];
    if (shortcut) {
      return db.getStock(shortcut.symbol) || {
        symbol: shortcut.symbol,
        name: shortcut.name,
        price: shortcut.price,
        previousPrice: shortcut.price,
        lastChange: 0,
        lastUpdated: Date.now()
      };
    }
  }

  const normalized = normalize(input);
  const stocks = db.getStocks();

  const exact = stocks.find((stock) => normalize(stock.symbol) === normalized || normalize(stock.name) === normalized);
  if (exact) return exact;

  return stocks.find((stock) =>
    normalize(stock.symbol).includes(normalized) ||
    normalize(stock.name).includes(normalized) ||
    normalized.includes(normalize(stock.symbol))
  ) || null;
}

function parseTradeArgs(args) {
  const cleanArgs = Array.isArray(args) ? args.map((arg) => String(arg || "").trim()).filter(Boolean) : [];
  if (cleanArgs.length < 2) return null;

  const amount = Number(cleanArgs[cleanArgs.length - 1]);
  const stockQuery = cleanArgs.slice(0, -1).join(" ").trim();

  if (!stockQuery || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return { stockQuery, amount };
}

async function buyStock({ db, profile, stock, amount }) {
  const cost = Number(stock.price || 0) * amount;
  if (Number(profile.uang || 0) < cost) {
    return { ok: false, reason: "Uang Tidak Cukup", cost };
  }

  await db.updateCore(profile.core_id, (core) => {
    core.uang = Math.max(0, Number(core.uang || 0) - cost);
    core.portfolio = core.portfolio || {};
    core.portfolio[stock.symbol] = Number(core.portfolio[stock.symbol] || 0) + amount;
    return core;
  });

  return {
    ok: true,
    cost,
    stock
  };
}

async function sellStock({ db, profile, stock, amount }) {
  const owned = Number((profile.portfolio || {})[stock.symbol] || 0);
  if (owned < amount) {
    return { ok: false, reason: "Saham Tidak Cukup", owned };
  }

  const income = Number(stock.price || 0) * amount;
  await db.updateCore(profile.core_id, (core) => {
    core.uang = Math.max(0, Number(core.uang || 0) + income);
    core.portfolio = core.portfolio || {};
    core.portfolio[stock.symbol] = owned - amount;
    if (core.portfolio[stock.symbol] <= 0) {
      delete core.portfolio[stock.symbol];
    }
    return core;
  });

  return {
    ok: true,
    income,
    stock
  };
}

module.exports = {
  renderStocks,
  summarizePortfolio,
  resolveStock,
  parseTradeArgs,
  buyStock,
  sellStock
};
