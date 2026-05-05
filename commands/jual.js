const { successEmbed, errorEmbed } = require("../utils/embeds");

const { money } = require("../utils/format");
const { parseTradeArgs, resolveStock, sellStock } = require("../utils/stockTrade");

module.exports = {
  name: "jual",
  aliases: ["sell"],
  description: "Jual saham dengan cepat.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const parsed = parseTradeArgs(args);
    if (!parsed) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.jual <saham> <jumlah>`")]
      });
    }

    const stock = resolveStock(db, parsed.stockQuery);
    if (!stock) {
      return message.reply({
        embeds: [errorEmbed("Saham Tidak Ditemukan", "Coba `.ind` untuk melihat daftar saham.")]
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
