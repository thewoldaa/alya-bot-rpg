const { infoEmbed, successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { money } = require("../utils/format");

module.exports = {
  name: "invest",
  aliases: ["saham"],
  description: "Beli dan jual saham di perusahaan fiktif server.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const action = args[0]?.toLowerCase();
    const symbol = args[1]?.toUpperCase();
    const qty = parseInt(args[2] || 1);

    const stocks = db.getStocks();

    if (!action || !["beli", "jual", "pasar", "portfolio"].includes(action)) {
      return message.reply({
        embeds: [infoEmbed("Sistem Saham", "Gunakan command berikut:\n`.invest pasar` - Lihat harga saham\n`.invest portfolio` - Lihat sahammu\n`.invest beli <simbol> <jumlah>`\n`.invest jual <simbol> <jumlah>`")]
      });
    }

    if (action === "pasar") {
      const list = stocks.map(s => {
        const diff = s.price - s.previousPrice;
        const indicator = diff > 0 ? "📈" : diff < 0 ? "📉" : "➖";
        return `**${s.name}** (\`${s.symbol}\`): **${money(s.price)}** ${indicator}`;
      }).join("\n");
      return message.reply({ embeds: [infoEmbed("Pasar Saham Hari Ini", list)] });
    }

    if (action === "portfolio") {
      const portfolio = profile.portfolio || {};
      const keys = Object.keys(portfolio);
      
      if (keys.length === 0) {
        return message.reply({ embeds: [infoEmbed("Portfolio Kosong", "Kamu belum memiliki saham apapun.")] });
      }

      let totalValue = 0;
      const list = keys.map(sym => {
        const stock = db.getStock(sym);
        const amount = portfolio[sym];
        const value = amount * (stock ? stock.price : 0);
        totalValue += value;
        return `**${sym}**: ${amount} lembar (Nilai: ${money(value)})`;
      }).join("\n");

      return message.reply({ embeds: [infoEmbed(`Portfolio: ${message.author.username}`, `${list}\n\n**Total Nilai Aset:** ${money(totalValue)}`)] });
    }

    if (!symbol) return message.reply("Sebutkan simbol sahamnya.");
    if (isNaN(qty) || qty <= 0) return message.reply("Jumlah tidak valid.");

    const stock = db.getStock(symbol);
    if (!stock) return message.reply({ embeds: [errorEmbed("Saham Tidak Valid", "Simbol saham tidak ditemukan di pasar.")] });

    if (action === "beli") {
      const cost = stock.price * qty;
      if (profile.uang < cost) {
        return message.reply({ embeds: [errorEmbed("Uang Kurang", `Kamu butuh ${money(cost)} untuk membeli ${qty} lembar ${symbol}.`)] });
      }

      await db.updateCore(profile.core_id, (core) => {
        core.uang -= cost;
        core.portfolio = core.portfolio || {};
        core.portfolio[symbol] = (core.portfolio[symbol] || 0) + qty;
        return core;
      });

      return message.reply({ embeds: [successEmbed("Pembelian Berhasil", `Kamu telah membeli **${qty} lembar ${symbol}** seharga **${money(cost)}**.`)] });
    }

    if (action === "jual") {
      const portfolio = profile.portfolio || {};
      const owned = portfolio[symbol] || 0;

      if (owned < qty) {
        return message.reply({ embeds: [errorEmbed("Saham Kurang", `Kamu hanya memiliki ${owned} lembar ${symbol}.`)] });
      }

      const earnings = stock.price * qty;

      await db.updateCore(profile.core_id, (core) => {
        core.uang += earnings;
        core.portfolio[symbol] -= qty;
        if (core.portfolio[symbol] <= 0) delete core.portfolio[symbol];
        return core;
      });

      return message.reply({ embeds: [successEmbed("Penjualan Berhasil", `Kamu telah menjual **${qty} lembar ${symbol}** dan mendapatkan **${money(earnings)}**.`)] });
    }
  }
};
