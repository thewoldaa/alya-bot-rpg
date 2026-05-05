const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const {  isOwner } = require("../utils/guards");
const { resolveCharacter } = require("../utils/characterSearch");
const { formatDate } = require("../utils/format");

module.exports = {
  name: "lamar",
  aliases: [],
  description: "Melamar character anime.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const query = args.join(" ").trim();
    if (!query) {
      return message.reply({
        embeds: [infoEmbed("Lamar Character", "Gunakan `.lamar <character>`")]
      });
    }

    const resolved = await resolveCharacter(query);
    if (!resolved.character) {
      return message.reply({
        embeds: [errorEmbed("Character Tidak Ditemukan", "Coba pakai nama character, anime, atau kata kunci lain.")]
      });
    }

    const current = resolved.character;
    const existing = db.getCharacterClaim(current.key);
    const maxClaims = isOwner(message.author.id, profile) ? 4 : 1;
    const ownedClaims = db.getCharacterClaimsByCore(profile.core_id);

    if (existing) {
      if (String(existing.core_id) === String(profile.core_id)) {
        return message.reply({
          embeds: [
            infoEmbed(
              "Sudah Diklaim",
              `${current.name} sudah kamu klaim sejak ${formatDate(existing.claimed_at)}.`
            )
          ]
        });
      }

      return message.reply({
        embeds: [
          errorEmbed(
            "Character Sudah Diambil",
            `${current.name} sudah diklaim oleh <@${existing.discord_id}> sejak ${formatDate(existing.claimed_at)}.`
          )
        ]
      });
    }

    if (ownedClaims.length >= maxClaims) {
      return message.reply({
        embeds: [
          errorEmbed(
            "Batas Character",
            `Kamu hanya bisa klaim ${maxClaims} character.`
          )
        ]
      });
    }

    const result = await db.claimCharacter({
      key: current.key,
      character: current,
      coreId: profile.core_id,
      discordId: message.author.id,
      username: profile.username || message.author.username
    });

    if (!result) {
      return message.reply({
        embeds: [errorEmbed("Lamaran Gagal", "Tidak bisa menyimpan claim character.")]
      });
    }

    return message.reply({
      embeds: [
        successEmbed(
          "Character Diklaim",
          `${current.name} sekarang menjadi milik kamu.\nWaktu: ${formatDate(result.claim.claimed_at)}`
        )
      ]
    });
  }
};
