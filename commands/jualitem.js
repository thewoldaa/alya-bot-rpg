const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");

const { money } = require("../utils/format");

const cooldowns = new Map();

module.exports = {
  name: "jualitem",
  aliases: ["listitem"],
  description: "Memasukkan barang ke pasar global (Listing Board).",
  async execute({ message, args, db, config }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    // Anti-Spam Cooldown (10s)
    const now = Date.now();
    const lastAction = cooldowns.get(message.author.id) || 0;
    if (now - lastAction < 10_000) {
      const remaining = Math.ceil((10_000 - (now - lastAction)) / 1000);
      return message.reply({
        embeds: [errorEmbed("Sabar Dong!", `Tunggu **${remaining} detik** lagi sebelum memasang listing baru.`)]
      });
    }

    if (args.length < 2) {
      return message.reply({
        embeds: [infoEmbed("Format Salah", "Gunakan `.jualitem <nama_item> <harga>`\nContoh: `.jualitem potion 500`")]
      });
    }

    const price = parseInt(args[args.length - 1]);
    const itemQuery = args.slice(0, -1).join(" ").toLowerCase();

    if (isNaN(price) || price <= 0) {
      return message.reply({
        embeds: [errorEmbed("Harga Tidak Valid", "Harga harus berupa angka positif.")]
      });
    }

    // Find item in inventory
    const inventory = profile.inventory || [];
    const itemInInv = inventory.find(i => i.key.toLowerCase() === itemQuery || 
                                          (config.shopItems.find(si => si.key === i.key)?.name.toLowerCase() === itemQuery));

    if (!itemInInv || itemInInv.qty <= 0) {
      return message.reply({
        embeds: [errorEmbed("Item Tidak Ditemukan", "Kamu tidak memiliki item tersebut di inventory.")]
      });
    }

    const itemDetails = config.shopItems.find(si => si.key === itemInInv.key);
    const itemName = itemDetails ? itemDetails.name : itemInInv.key;
    const basePrice = itemDetails ? itemDetails.price : 100;

    const minPrice = Math.floor(basePrice * 0.5);
    const maxPrice = Math.floor(basePrice * 5);

    if (price < minPrice || price > maxPrice) {
      return message.reply({
        embeds: [errorEmbed("Harga Tidak Wajar", `Harga **${itemName}** harus di antara **${money(minPrice)}** sampai **${money(maxPrice)}**.`)]
      });
    }

    // Remove 1 from inventory
    await db.removeInventoryItem(profile.core_id, itemInInv.key, 1);

    // Add to market
    const listing = await db.addMarketListing({
      sellerCoreId: profile.core_id,
      sellerName: message.author.username,
      itemKey: itemInInv.key,
      qty: 1,
      price: price
    });

    cooldowns.set(message.author.id, now);

    return message.reply({
      embeds: [
        successEmbed(
          "Listing Berhasil",
          `Berhasil memasang **${itemName}** ke market dengan harga **${money(price)}**.\nID Listing: \`${listing.id}\``
        )
      ]
    });
  }
};
