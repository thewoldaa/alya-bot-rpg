const { successEmbed, infoEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

module.exports = {
  name: "market",
  aliases: ["papan"],
  description: "Melihat daftar barang yang dijual di pasar global.",
  async execute({ message, db, config }) {
    const listings = db.getMarketListings();

    if (listings.length === 0) {
      return message.reply({
        embeds: [infoEmbed("Global Market", "Saat ini belum ada barang yang dijual. Jadilah yang pertama!")]
      });
    }

    const lines = listings.map((l, i) => {
      const itemDetails = config.shopItems.find(si => si.key === l.itemKey);
      const itemName = itemDetails ? itemDetails.name : l.itemKey;
      return `${i + 1}. **${itemName}** (x${l.qty}) - \`${l.id}\`\n   Harga: **${money(l.price)}** | Penjual: *${l.sellerName}*`;
    });

    return message.reply({
      embeds: [
        infoEmbed(
          "🛒 Global Market Board",
          lines.join("\n\n") + "\n\n*Gunakan `.beliitem <ID>` untuk membeli.*"
        )
      ]
    });
  }
};
