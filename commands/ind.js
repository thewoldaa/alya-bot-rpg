const { infoEmbed, successEmbed, errorEmbed } = require("../utils/embeds");

const { money } = require("../utils/format");
const { renderStocks, resolveStock, parseTradeArgs, buyStock, sellStock, summarizePortfolio } = require("../utils/stockTrade");

function summarizeMarket(db) {
  const stocks = db.getStocks();
  if (!stocks.length) {
    return {
      indexNow: 0,
      indexPrev: 0,
      indexChange: 0,
      topGainer: null,
      topLoser: null
    };
  }

  const indexNow = stocks.reduce((sum, stock) => sum + Number(stock.price || 0), 0);
  const indexPrev = stocks.reduce((sum, stock) => sum + Number(stock.previousPrice || stock.price || 0), 0);
  const indexChange = indexPrev > 0 ? ((indexNow - indexPrev) / indexPrev) * 100 : 0;
  const sortedByChange = [...stocks].sort((a, b) => Number(b.lastChange || 0) - Number(a.lastChange || 0));

  return {
    indexNow,
    indexPrev,
    indexChange,
    topGainer: sortedByChange[0] || null,
    topLoser: sortedByChange[sortedByChange.length - 1] || null
  };
}

module.exports = {
  name: "ind",
  aliases: ["stock"],
  description: "Informasi saham.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const action = (args[0] || "").toLowerCase();

    if (!action || action === "list" || action === "chart" || action === "grafik") {
      const portfolio = summarizePortfolio(db, profile.portfolio || {});
      const market = summarizeMarket(db);
      const marketLines = [
        `Index gabungan: **${money(market.indexNow)}**`,
        `Perubahan index: **${market.indexChange >= 0 ? "+" : ""}${market.indexChange.toFixed(2)}%**`,
        market.topGainer
          ? `Top naik: **${market.topGainer.symbol}** (${market.topGainer.lastChange >= 0 ? "+" : ""}${Number(market.topGainer.lastChange || 0).toFixed(2)}%)`
          : null,
        market.topLoser
          ? `Top turun: **${market.topLoser.symbol}** (${market.topLoser.lastChange >= 0 ? "+" : ""}${Number(market.topLoser.lastChange || 0).toFixed(2)}%)`
          : null,
        "",
        `Portfolio market value: **${money(portfolio.totalValue)}**`
      ].filter(Boolean);

      const sent = await message.reply({
        embeds: [
          infoEmbed("Market Index", marketLines.join("\n")),
          infoEmbed(
            "Portfolio Detail",
            `${renderStocks(db)}\n\n**Portfolio Market Value**\nTotal: **${money(portfolio.totalValue)}**\n${portfolio.lines.join("\n")}`
          )
        ]
      });

      return sent;
    }

    if (action !== "buy" && action !== "sell" && action !== "jual" && action !== "beli") {
      return message.reply({
        embeds: [
          infoEmbed(
            "Market",
            "Gunakan `.ind` untuk melihat market, `.ind beli <saham> <jumlah>` / `.ind jual <saham> <jumlah>` atau command cepat `.beli` / `.jual`."
          )
        ]
      });
    }

    const parsed = parseTradeArgs(args.slice(1));
    if (!parsed) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.ind beli <saham> <jumlah>`")]
      });
    }

    const stock = resolveStock(db, parsed.stockQuery);
    if (!stock) {
      return message.reply({
        embeds: [errorEmbed("Saham Tidak Ditemukan", renderStocks(db))]
      });
    }

    if (action === "buy" || action === "beli") {
      const result = await buyStock({
        db,
        profile,
        stock,
        amount: parsed.amount
      });

      if (!result.ok) {
        return message.reply({
          embeds: [errorEmbed("Uang Tidak Cukup", `Butuh ${money(result.cost)}.`)]
        });
      }

      return message.reply({
        embeds: [
          successEmbed(
            "Beli Saham",
            `Kamu membeli ${stock.symbol} x${parsed.amount} seharga ${money(result.cost)}.`
          )
        ]
      });
    }

    const result = await sellStock({
      db,
      profile,
      stock,
      amount: parsed.amount
    });

    if (!result.ok) {
      return message.reply({
        embeds: [errorEmbed("Saham Tidak Cukup", `Kamu hanya punya x${result.owned}.`)]
      });
    }

    return message.reply({
      embeds: [
        successEmbed(
          "Jual Saham",
          `Kamu menjual ${stock.symbol} x${parsed.amount} dan mendapat ${money(result.income)}.`
        )
      ]
    });
  }
};
