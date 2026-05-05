const { successEmbed, errorEmbed } = require("../utils/embeds");

const { money } = require("../utils/format");
const { parseTradeArgs, resolveStock, buyStock } = require("../utils/stockTrade");

module.exports = {
  name: "beli",
  aliases: ["buy"],
  description: "Beli saham dengan cepat.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const parsed = parseTradeArgs(args);
    if (!parsed) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.beli <saham> <jumlah>`")]
      });
    }

    const stock = resolveStock(db, parsed.stockQuery);
    if (!stock) {
      return message.reply({
        embeds: [errorEmbed("Saham Tidak Ditemukan", "Coba `.ind` untuk melihat daftar saham.")]
      });
    }

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
};
