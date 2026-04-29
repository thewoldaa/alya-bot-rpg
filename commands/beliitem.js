const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { money } = require("../utils/format");

module.exports = {
  name: "beliitem",
  aliases: ["buyitem"],
  description: "Membeli barang dari market menggunakan ID transaksi.",
  async execute({ message, args, db, config }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const listingId = args[0];
    if (!listingId) {
      return message.reply({
        embeds: [errorEmbed("ID Diperlukan", "Gunakan `.beliitem <ID_LISTING>`")]
      });
    }

    const listing = db.getMarketListing(listingId);
    if (!listing) {
      return message.reply({
        embeds: [errorEmbed("Listing Tidak Ditemukan", "ID tersebut tidak valid atau barang sudah laku.")]
      });
    }

    if (listing.sellerCoreId === profile.core_id) {
      return message.reply({
        embeds: [errorEmbed("Eits!", "Kamu tidak bisa membeli barang daganganmu sendiri.")]
      });
    }

    if ((profile.uang || 0) < listing.price) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Kamu butuh **${money(listing.price)}** untuk membeli ini.`)]
      });
    }

    // Process Transaction
    const taxRate = 0.05; // 5% tax
    const tax = Math.floor(listing.price * taxRate);
    const sellerIncome = listing.price - tax;

    // 1. Buyer: Deduct Money, Add Item
    await db.updateCore(profile.core_id, (core) => {
      core.uang = Math.max(0, (core.uang || 0) - listing.price);
      return core;
    });
    await db.addInventoryItem(profile.core_id, listing.itemKey, listing.qty);

    // 2. Seller: Add Money (minus tax)
    await db.addMoney(listing.sellerCoreId, sellerIncome);

    // 3. Remove Listing
    await db.removeMarketListing(listingId);

    const itemDetails = config.shopItems.find(si => si.key === listing.itemKey);
    const itemName = itemDetails ? itemDetails.name : listing.itemKey;

    return message.reply({
      embeds: [
        successEmbed(
          "Pembelian Berhasil",
          `Kamu telah membeli **${itemName}** x${listing.qty} seharga **${money(listing.price)}**.\nPajak 5% (**${money(tax)}**) telah dipotong dari hasil penjualan.`
        )
      ]
    });
  }
};
