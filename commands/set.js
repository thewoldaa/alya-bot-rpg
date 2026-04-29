const { infoEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireRegistered, isOwner } = require("../utils/guards");

function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function resolveReferencedImage(message) {
  const directAttachment = message.attachments?.first();
  if (directAttachment?.url) {
    return directAttachment.url;
  }

  if (message.content) {
    const urlMatch = message.content.match(/https?:\/\/\S+/i);
    if (urlMatch && isValidHttpUrl(urlMatch[0])) {
      return urlMatch[0];
    }
  }

  const referenceId = message.reference?.messageId;
  if (!referenceId) return null;

  try {
    const referenced = await message.channel.messages.fetch(referenceId);
    const attachment = referenced.attachments?.first();
    if (attachment?.url) {
      return attachment.url;
    }

    const embedImage = referenced.embeds?.find((embed) => embed?.image?.url || embed?.thumbnail?.url);
    const embedUrl = embedImage?.image?.url || embedImage?.thumbnail?.url;
    if (isValidHttpUrl(embedUrl)) {
      return embedUrl;
    }

    const urlMatch = referenced.content?.match(/https?:\/\/\S+/i);
    if (urlMatch && isValidHttpUrl(urlMatch[0])) {
      return urlMatch[0];
    }
  } catch {
    return null;
  }

  return null;
}

module.exports = {
  name: "set",
  aliases: ["setpdpp"],
  description: "Pengaturan custom untuk PD owner.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    if (!requireAuthority(message, "Owner")) return;

    const group = String(args[0] || "").toLowerCase();
    const subject = String(args[1] || "").toLowerCase();

    if (group !== "pd" || subject !== "pp") {
      return message.reply({
        embeds: [
          infoEmbed(
            "Set PD",
            "Gunakan `.set pd pp <slot>` lalu reply atau kirim gambar pada pesan command.\nContoh: `.set pd pp 1`"
          )
        ]
      });
    }

    const slot = Number(args[2] || 0);
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
      return message.reply({
        embeds: [errorEmbed("Slot Tidak Valid", "Pilih slot 1, 2, 3, atau 4.")]
      });
    }

    const claims = db.getCharacterClaimsByCore(profile.core_id);
    const claim = claims[slot - 1];
    if (!claim) {
      return message.reply({
        embeds: [errorEmbed("Slot Kosong", `Kamu belum punya character di slot ${slot}.`)]
      });
    }

    const directUrl = args.slice(3).find((arg) => isValidHttpUrl(arg));
    const imageUrl = directUrl || await resolveReferencedImage(message);
    if (!imageUrl) {
      return message.reply({
        embeds: [
          errorEmbed(
            "Gambar Tidak Ditemukan",
            "Reply ke gambar atau kirim attachment/image URL saat memakai `.set pd pp <slot>`."
          )
        ]
      });
    }

    const updated = await db.setCharacterClaimPhoto(claim.key, imageUrl);
    if (!updated) {
      return message.reply({
        embeds: [errorEmbed("Gagal Menyimpan", "Tidak bisa menyimpan gambar PD untuk slot ini.")]
      });
    }

    return message.reply({
      embeds: [
        successEmbed(
          "PP PD Diset",
          `Foto PD untuk slot **${slot}** sudah disimpan.\nCoba buka \`.pd ${slot}\` untuk melihat hasilnya.`
        )
      ]
    });
  }
};
