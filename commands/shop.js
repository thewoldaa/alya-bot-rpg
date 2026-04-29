const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { resolveShopItem } = require("../utils/helpers");
const { money } = require("../utils/format");

function renderShop(config) {
  return config.shopItems
    .map((item, index) => `**${index + 1}.** **${item.key}** (${item.name}) - ${money(item.price)}\n  ${item.desc}`)
    .join("\n");
}

function parseBuyArgs(args) {
  const raw = Array.isArray(args) ? args.map((arg) => String(arg || "").trim()).filter(Boolean) : [];
  if (!raw.length) return null;

  const amountCandidate = raw[raw.length - 1];
  const hasAmount = /^\d+$/.test(amountCandidate);
  const amount = hasAmount ? Math.max(1, Number(amountCandidate)) : 1;
  const itemQuery = hasAmount ? raw.slice(0, -1).join(" ").trim() : raw.join(" ").trim();

  if (!itemQuery) return null;
  return { itemQuery, amount };
}

module.exports = {
  name: "shop",
  aliases: ["s"],
  description: "Melihat dan membeli item.",
  async execute({ message, args, db, config, commandName }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const invokedAsShortcut = String(commandName || "").toLowerCase() === "s";
    const firstArg = String(args[0] || "").toLowerCase();
    const action = invokedAsShortcut
      ? ((firstArg === "list" || firstArg === "daftar") ? "list" : (firstArg === "buy" || firstArg === "beli") ? firstArg : "beli")
      : (firstArg || "list");

    if (action === "list" || action === "daftar") {
      return message.reply({
        embeds: [
          infoEmbed("Shop", renderShop(config))
        ]
      });
    }

    if (action !== "buy" && action !== "beli") {
      return message.reply({
        embeds: [
          infoEmbed(
            "Shop",
            `Gunakan:\n.shop\n.shop buy <item> [jumlah]\n.s <item/nomor> [jumlah]`
          )
        ]
      });
    }

    const tradeArgs = invokedAsShortcut && (firstArg !== "buy" && firstArg !== "beli")
      ? args
      : args.slice(1);
    const parsed = parseBuyArgs(tradeArgs);
    if (!parsed) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.s <barang/nomor> [jumlah]`")]
      });
    }

    const item = resolveShopItem(parsed.itemQuery);
    if (!item) {
      return message.reply({
        embeds: [errorEmbed("Item Tidak Ditemukan", renderShop(config))]
      });
    }

    const total = item.price * parsed.amount;
    const current = db.getCoreByDiscordId(message.author.id);
    if ((current?.uang || 0) < total) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Butuh ${money(total)}.`)]
      });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.uang = Math.max(0, Number(core.uang || 0) - total);
      if (item.key === "limit") {
        core.limit = Number(core.limit || 0) + parsed.amount;
      } else {
        const inv = Array.isArray(core.inventory) ? core.inventory : [];
        const found = inv.find((entry) => entry.key === item.key);
        if (found) {
          found.qty += parsed.amount;
        } else {
          inv.push({ key: item.key, qty: parsed.amount });
        }
        core.inventory = inv;
      }
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Pembelian Berhasil",
          `Kamu membeli **${item.name}** x${parsed.amount} seharga ${money(total)}.`
        )
      ]
    });
  }
};
