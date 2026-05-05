const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const { infoEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const {  isOwner } = require("../utils/guards");
const { money, formatDate } = require("../utils/format");
const { uid } = require("../utils/random");
const { startActPrompt } = require("../utils/actSystem");

function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveClaimImage(claim) {
  if (isValidHttpUrl(claim?.pp)) {
    return claim.pp;
  }

  if (isValidHttpUrl(claim?.character?.image)) {
    return claim.character.image;
  }

  return "";
}

function getClaimsForProfile(db, profile) {
  return db.getCharacterClaimsByCore(profile.core_id);
}

function getClaimAt(claims, index) {
  return claims[index] || null;
}

function buildPageButton(label, sessionId, index, active, disabled = false) {
  return new ButtonBuilder()
    .setCustomId(`pd:${sessionId}:page:${index}`)
    .setLabel(label)
    .setStyle(active ? ButtonStyle.Primary : ButtonStyle.Secondary)
    .setDisabled(disabled);
}

function buildActionButtons(sessionId, disabled = false, hasClaim = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pd:${sessionId}:act`)
      .setLabel("Act")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled || !hasClaim),
    new ButtonBuilder()
      .setCustomId(`pd:${sessionId}:feed`)
      .setLabel("Beri Makan")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || !hasClaim),
    new ButtonBuilder()
      .setCustomId(`pd:${sessionId}:money`)
      .setLabel("Beri Uang")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || !hasClaim),
    new ButtonBuilder()
      .setCustomId(`pd:${sessionId}:refresh`)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`pd:${sessionId}:close`)
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildPageButtons(sessionId, claims, selectedIndex, disabled = false) {
  const buttons = [];
  for (let i = 0; i < 4; i += 1) {
    const hasClaim = Boolean(claims[i]);
    buttons.push(buildPageButton(String(i + 1), sessionId, i, i === selectedIndex, disabled || !hasClaim));
  }
  return new ActionRowBuilder().addComponents(buttons);
}

function buildDashboardEmbed(db, profile, guild, claims, selectedIndex) {
  const claim = getClaimAt(claims, selectedIndex);
  const total = claims.length;

  if (!claim) {
    return infoEmbed(
      "PD Character",
      [
        `Kamu belum punya character yang diklaim.`,
        "",
        `Total claim: **${total}**`,
        "Gunakan `.character` atau `.lamar` untuk klaim character.",
        `Owner bisa simpan sampai **4** character.`,
      ].join("\n")
    );
  }

  const character = claim.character || {};
  const image = resolveClaimImage(claim);
  const lines = [
    `Slot: **${selectedIndex + 1}/4**`,
    `Nama: **${character.name || "Unknown"}**`,
    `Anime: **${character.anime || "Unknown"}**`,
    `Hunger: **${Number(claim.hunger || 0)}/100**`,
    `Uang: **${money(claim.uang || 0)}**`,
    `Bond: **${Number(claim.bond || 0)}**`,
    `Mood: **${claim.mood || "normal"}**`,
    `PP: **${claim.pp ? "Custom" : "Default"}**`,
    `Diklaim: **${formatDate(claim.claimed_at)}**`,
    `Status: ${String(claim.core_id) === String(profile.core_id) ? "Milik kamu" : "Milik core lain"}`,
    `Link: ${character.link || "-"}`,
    "",
    "Gunakan tombol di bawah untuk `Act`, `Beri Makan`, atau `Beri Uang`."
  ];

  const embed = infoEmbed("PD Character", lines.join("\n"));
  if (isValidHttpUrl(image)) {
    embed.setImage(image);
  }
  embed.setFooter({ text: `Character ${selectedIndex + 1}/${Math.max(1, total)} • ${guild?.name || "Mahiru Bot"}` });
  return embed;
}

module.exports = {
  name: "pd",
  aliases: [],
  description: "Melihat character yang diklaim dan aksi PD.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const claims = getClaimsForProfile(db, profile);
    const inputPage = Number(args[0] || 1);
    const isOwnerAccount = isOwner(message.author.id, profile);
    const maxPage = isOwnerAccount ? 4 : 1;
    const requestedIndex = Number.isFinite(inputPage) ? Math.max(1, Math.min(maxPage, Math.floor(inputPage))) - 1 : 0;

    if (requestedIndex >= claims.length && claims.length > 0) {
      return message.reply({
        embeds: [
          errorEmbed(
            "Slot Kosong",
            `Kamu hanya punya ${claims.length} character claim. Coba \`.pd 1\` sampai \`.pd ${claims.length}\`.`
          )
        ]
      });
    }

    let selectedIndex = claims.length ? Math.min(requestedIndex, claims.length - 1) : 0;
    const sessionId = uid("pd_");
    let closed = false;

    const sent = await message.reply({
      embeds: [buildDashboardEmbed(db, profile, message.guild, claims, selectedIndex)],
      components: [
        buildPageButtons(sessionId, claims, selectedIndex),
        buildActionButtons(sessionId, false, Boolean(getClaimAt(claims, selectedIndex)))
      ]
    });

    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.customId.startsWith("pd:")) return;

      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: `Panel ini milik <@${message.author.id}>.`,
          flags: 64
        }).catch(() => {});
        return;
      }

      const parts = interaction.customId.split(":");
      const action = parts[2];
      if (!action) {
        await interaction.reply({
          embeds: [errorEmbed("Interaksi Gagal", "Tombol ini tidak terbaca dengan benar.")],
          flags: 64
        }).catch(() => {});
        return;
      }

      if (action === "page") {
        const nextIndex = Number(parts[3] || 0);
        const refreshedClaims = getClaimsForProfile(db, profile);
        if (!refreshedClaims[nextIndex]) {
          await interaction.reply({
            embeds: [errorEmbed("Slot Kosong", `Slot ${nextIndex + 1} belum ada character.`)],
            flags: 64
          }).catch(() => {});
          return;
        }

        selectedIndex = nextIndex;
        await interaction.update({
          embeds: [buildDashboardEmbed(db, profile, message.guild, refreshedClaims, selectedIndex)],
          components: [
            buildPageButtons(sessionId, refreshedClaims, selectedIndex),
            buildActionButtons(sessionId, false, true)
          ]
        }).catch(() => {});
        return;
      }

      if (action === "close") {
        closed = true;
        collector.stop("closed");
        const refreshedClaims = getClaimsForProfile(db, profile);
        await interaction.update({
          embeds: [buildDashboardEmbed(db, profile, message.guild, refreshedClaims, selectedIndex)],
          components: [
            buildPageButtons(sessionId, refreshedClaims, selectedIndex, true),
            buildActionButtons(sessionId, true, Boolean(getClaimAt(refreshedClaims, selectedIndex)))
          ]
        }).catch(() => {});
        return;
      }

      if (action === "refresh") {
        const refreshedClaims = getClaimsForProfile(db, profile);
        if (selectedIndex >= refreshedClaims.length && refreshedClaims.length > 0) {
          selectedIndex = refreshedClaims.length - 1;
        }

        await interaction.update({
          embeds: [buildDashboardEmbed(db, profile, message.guild, refreshedClaims, selectedIndex)],
          components: [
            buildPageButtons(sessionId, refreshedClaims, selectedIndex),
            buildActionButtons(sessionId, false, Boolean(getClaimAt(refreshedClaims, selectedIndex)))
          ]
        }).catch(() => {});
        return;
      }

      const refreshedClaims = getClaimsForProfile(db, profile);
      const claim = getClaimAt(refreshedClaims, selectedIndex);
      if (!claim) {
        await interaction.reply({
          embeds: [errorEmbed("Tidak Ada Character", "Kamu belum punya character di slot ini.")],
          flags: 64
        }).catch(() => {});
        return;
      }

      if (action === "act") {
        await interaction.deferReply({ flags: 64 }).catch(() => {});
        const prompt = await startActPrompt({
          channel: message.channel,
          profile,
          userId: message.author.id,
          db,
          targetClaim: claim,
          slotIndex: selectedIndex,
          showSlot: isOwner(message.author.id, profile)
        });

        if (!prompt.ok) {
          await interaction.editReply({
            embeds: [prompt.embed || errorEmbed("Act Gagal", "Prompt act tidak bisa dibuat.")]
          }).catch(() => {});
          return;
        }

        await interaction.editReply({
          embeds: [
            successEmbed(
              "Prompt Act Dikirim",
              `Chat prompt untuk **${claim.character?.name || "character"}** sudah dikirim. Balas pesan itu dengan **1**, **2**, atau **3**.`
            )
          ]
        }).catch(() => {});
        return;
      }

      if (action === "feed") {
        const cost = 500;
        if (Number(profile.uang || 0) < cost) {
          await interaction.reply({
            embeds: [errorEmbed("Uang Tidak Cukup", `Butuh ${money(cost)} untuk memberi makan.`)],
            flags: 64
          }).catch(() => {});
          return;
        }

        await db.addMoney(profile.core_id, -cost);
        await db.feedCharacterClaim(claim.key, 20);
        await interaction.update({
          embeds: [buildDashboardEmbed(db, profile, message.guild, getClaimsForProfile(db, profile), selectedIndex)],
          components: [
            buildPageButtons(sessionId, getClaimsForProfile(db, profile), selectedIndex),
            buildActionButtons(sessionId, false, true)
          ]
        }).catch(() => {});
        await interaction.followUp({
          embeds: [
            successEmbed(
              "Beri Makan",
              `Kamu memberi makan **${claim.character?.name || "character"}**. Hunger naik dan kamu mengeluarkan ${money(cost)}.`
            )
          ],
          flags: 64
        }).catch(() => {});
        return;
      }

      if (action === "money") {
        const cost = 1000;
        if (Number(profile.uang || 0) < cost) {
          await interaction.reply({
            embeds: [errorEmbed("Uang Tidak Cukup", `Butuh ${money(cost)} untuk memberi uang.`)],
            flags: 64
          }).catch(() => {});
          return;
        }

        await db.addMoney(profile.core_id, -cost);
        await db.addCharacterClaimMoney(claim.key, cost);
        await interaction.update({
          embeds: [buildDashboardEmbed(db, profile, message.guild, getClaimsForProfile(db, profile), selectedIndex)],
          components: [
            buildPageButtons(sessionId, getClaimsForProfile(db, profile), selectedIndex),
            buildActionButtons(sessionId, false, true)
          ]
        }).catch(() => {});
        await interaction.followUp({
          embeds: [
            successEmbed(
              "Beri Uang",
              `Kamu memberi ${money(cost)} ke **${claim.character?.name || "character"}**.`
            )
          ],
          flags: 64
        }).catch(() => {});
      }
    });

    collector.on("end", async () => {
      if (closed) return;
      const refreshedClaims = getClaimsForProfile(db, profile);
      try {
        await sent.edit({
          components: [
            buildPageButtons(sessionId, refreshedClaims, Math.min(selectedIndex, Math.max(0, refreshedClaims.length - 1)), true),
            buildActionButtons(sessionId, true, Boolean(getClaimAt(refreshedClaims, selectedIndex)))
          ]
        });
      } catch {}
    });

    return sent;
  }
};
