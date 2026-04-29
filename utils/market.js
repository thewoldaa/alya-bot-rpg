const { randInt, chance } = require("./random");
const { stockHistoryLimit } = require("../config");

function updateStockState(stocks) {
  const notifications = [];

  for (const stock of Object.values(stocks)) {
    const prev = Number(stock.price || 1);
    const base = Math.max(1, Number(stock.basePrice || prev || 1));
    const minPrice = Math.max(1, Math.round(base * 0.25));
    const maxPrice = Math.max(minPrice, Math.round(base * 4));

    // Mean reversion ke harga dasar supaya market tidak ambruk ke 1 terus.
    const drift = Math.round(((base - prev) / Math.max(base, 1)) * 8);
    let change = randInt(-8, 8) + drift;

    if (chance(10)) {
      change += randInt(6, 18);
    }

    if (chance(10)) {
      change -= randInt(6, 18);
    }

    if (chance(4)) {
      change += randInt(-20, 20);
    }

    const nextPrice = Math.max(
      minPrice,
      Math.min(maxPrice, Math.round(prev * (1 + (change / 100))))
    );
    stock.previousPrice = prev;
    stock.price = nextPrice;
    stock.lastChange = ((nextPrice - prev) / prev) * 100;
    stock.lastUpdated = Date.now();
    stock.history = Array.isArray(stock.history) ? stock.history : [];
    stock.history.push(nextPrice);
    if (stock.history.length > stockHistoryLimit) {
      stock.history.splice(0, stock.history.length - stockHistoryLimit);
    }

    if (Math.abs(stock.lastChange) >= 15) {
      notifications.push({
        symbol: stock.symbol,
        name: stock.name,
        change: stock.lastChange,
        price: stock.price
      });
    }
  }

  return { stocks, notifications };
}

module.exports = {
  updateStockState
};
