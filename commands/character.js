const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const { infoEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered, isOwner } = require("../utils/guards");
const { resolveCharacter, getRandomLocalCharacter, getRandomApiCharacter } = require("../utils/characterSearch");
const { chance } = require("../utils/random");
const { uid } = require("../utils/random");
const { formatDate } = require("../utils/format");

function getClaimText(claim, profile) {
  if (!claim) {
    return "Belum diklaim.";
  }

  if (profile && String(claim.core_id) === String(profile.core_id)) {
    return `Sudah kamu klaim sejak ${formatDate(claim.claimed_at)}.`;
  }

  return `Diklaim oleh <@${claim.discord_id}> sejak ${formatDate(claim.claimed_at)}.`;
}

function buildCharacterEmbed(character, claim, profile, sourceLabel) {
  const status = getClaimText(claim, profile);
  const embed = infoEmbed(
    `${character.name}`,
    [
      `ID: **${character.id}**`,
      `Anime: **${character.anime}**`,
      `Sumber: **${sourceLabel}**`,
      `Link: ${character.link || "-"}`,
      `Status: **${status}**`,
      "",
      "Gunakan tombol di bawah untuk `Lamar` atau cari character lain dengan `Acak`."
    ].join("\n")
  );

  if (isValidHttpUrl(character.image)) {
    embed.setImage(character.image);
  }

  embed.setFooter({
    text: `Character Key: ${character.key}`
  });

  return embed;
}

function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildButtons(sessionId, disabled = false, isLocked = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`character:${sessionId}:lamar`)
      .setLabel(isLocked ? "Sudah Diklaim" : "Lamar")
      .setStyle(isLocked ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(disabled || isLocked),
    new ButtonBuilder()
      .setCustomId(`character:${sessionId}:acak`)
      .setLabel("Acak")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

module.exports = {
  name: "character",
  aliases: ["char", "mal"],
  description: "Mencari dan melamar character anime.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const query = args.join(" ").trim();
    if (!query) {
      return message.reply({
        embeds: [infoEmbed("Character", "Gunakan `.character <id/nama>`")]
      });
    }

    const resolved = await resolveCharacter(query);
    let current = resolved.character;
    let currentSourceLabel = resolved.source === "jikan" ? "Jikan API" : "Database lokal";
    if (!current) {
      return message.reply({
        embeds: [errorEmbed("Character Tidak Ditemukan", "Coba pakai nama character, anime, atau kata kunci lain.")]
      });
    }

    const sessionId = uid("char_");
    let claim = db.getCharacterClaim(current.key);

    const sent = await message.reply({
      embeds: [buildCharacterEmbed(current, claim, profile, currentSourceLabel)],
      components: [buildButtons(sessionId, false, Boolean(claim))]
    });

    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.customId.startsWith(`character:${sessionId}:`)) return;

      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: `Character card ini milik <@${message.author.id}>.`,
          flags: 64
        }).catch(() => {});
        return;
      }

      const action = interaction.customId.split(":")[2];

      if (action === "acak") {
        const useApiFirst = chance(50);
        let randomCharacter = null;

        if (useApiFirst) {
          randomCharacter = await getRandomApiCharacter(current).catch(() => null);
          if (!randomCharacter) {
            randomCharacter = getRandomLocalCharacter(current.key);
          }
        } else {
          randomCharacter = getRandomLocalCharacter(current.key);
          if (!randomCharacter) {
            randomCharacter = await getRandomApiCharacter(current).catch(() => null);
          }
        }

        if (!randomCharacter) {
          await interaction.reply({
            embeds: [errorEmbed("Acak Gagal", "Tidak ada character lain yang tersedia.")],
            flags: 64
          }).catch(() => {});
          return;
        }

        if (randomCharacter.source === "jikan") {
          current = randomCharacter;
          currentSourceLabel = "Jikan API";
        } else {
          current = randomCharacter;
          currentSourceLabel = "Database lokal";
        }
        claim = db.getCharacterClaim(current.key);

        await interaction.update({
          embeds: [buildCharacterEmbed(current, claim, profile, currentSourceLabel)],
          components: [buildButtons(sessionId, false, Boolean(claim))]
        }).catch(() => {});
        return;
      }

      if (action === "lamar") {
        const latestClaim = db.getCharacterClaim(current.key);
        if (latestClaim && String(latestClaim.core_id) !== String(profile.core_id)) {
          await interaction.reply({
            embeds: [
              errorEmbed(
                "Character Sudah Diambil",
                `Character ini sudah diklaim oleh <@${latestClaim.discord_id}>.`
              )
            ],
            flags: 64
          }).catch(() => {});
          return;
        }

        const maxClaims = isOwner(message.author.id, profile) ? 4 : 1;
        const ownedClaims = db.getCharacterClaimsByCore(profile.core_id);
        if (!latestClaim && ownedClaims.length >= maxClaims) {
          await interaction.reply({
            embeds: [errorEmbed("Batas Character", `Kamu hanya bisa klaim ${maxClaims} character.`)],
            flags: 64
          }).catch(() => {});
          return;
        }

        const result = await db.claimCharacter({
          key: current.key,
          character: current,
          coreId: profile.core_id,
          discordId: message.author.id,
          username: profile.username || message.author.username
        });

        if (!result) {
          await interaction.reply({
            embeds: [errorEmbed("Lamaran Gagal", "Tidak bisa menyimpan claim character.")],
            flags: 64
          }).catch(() => {});
          return;
        }

        claim = result.claim;

        if (result.status === "owned") {
          await interaction.reply({
            embeds: [infoEmbed("Sudah Diklaim", "Character ini sudah kamu klaim sebelumnya.")],
            flags: 64
          }).catch(() => {});
        } else {
          const updatedClaim = db.getCharacterClaim(current.key);
          await interaction.update({
            embeds: [buildCharacterEmbed(current, updatedClaim || claim, profile, currentSourceLabel)],
            components: [buildButtons(sessionId, false, true)]
          }).catch(() => {});

          await interaction.followUp({
            embeds: [
              infoEmbed(
                "Character Diklaim",
                `${current.name} sekarang jadi milik kamu.\n${getClaimText(updatedClaim || claim, profile)}`
              )
            ],
            flags: 64
          }).catch(() => {});
        }
      }
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: [buildButtons(sessionId, true, Boolean(claim))]
        });
      } catch {}
    });

    return sent;
  }
};
