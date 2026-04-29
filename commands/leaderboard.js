const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const { infoEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { money, number } = require("../utils/format");
const { uid } = require("../utils/random");
const { getGearBonuses } = require("../utils/gear");

function sumPortfolioValue(core, db) {
  return Object.entries(core.portfolio || {}).reduce((total, [symbol, qty]) => {
    const stock = db.getStock(symbol);
    return total + ((stock?.price || 0) * Number(qty || 0));
  }, 0);
}

function getHouseValue(core) {
  return Number(core.rumah?.price || 0);
}

function getWealth(core, db) {
  return Number(core.uang || 0) + sumPortfolioValue(core, db) + getHouseValue(core);
}

function getCharacterClaimCount(core, db) {
  return db.getCharacterClaimsByCore(core.core_id).length;
}

function buildRankList(cores, scoreFn) {
  return cores
    .map((core) => ({ core, score: scoreFn(core) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const levelDelta = Number(b.core.level || 0) - Number(a.core.level || 0);
      if (levelDelta !== 0) return levelDelta;
      return Number(b.core.xp || 0) - Number(a.core.xp || 0);
    });
}

function formatRankLine(entry, index, ctx, valueLabel, valueText) {
  const marker = entry.core.linked_accounts?.includes(ctx.user.id) ? "⭐" : "─";
  const name = entry.core.username || "Unknown";
  return `${marker} **${index + 1}.** ${name} - ${valueLabel}: **${valueText}**`;
}

function buildBoardEmbed(page, ctx, index, total) {
  const ranked = page.rankFn(ctx.cores, ctx.db).slice(0, 10);
  const myEntryIndex = page.rankFn(ctx.cores, ctx.db).findIndex((entry) =>
    String(entry.core.core_id) === String(ctx.profile.core_id)
  );

  const lines = ranked.length
    ? ranked.map((entry, rankIndex) => formatRankLine(
        entry,
        rankIndex,
        ctx,
        page.valueLabel,
        page.valueText(entry.core, ctx.db)
      ))
    : ["Belum ada data."];

  const embed = infoEmbed(
    page.title,
    [
      `Total pemain: **${number(ctx.cores.length)}**`,
      "",
      ...lines,
      "",
      myEntryIndex >= 0
        ? `Rank kamu: **#${myEntryIndex + 1}**`
        : "Kamu belum masuk leaderboard ini."
    ].join("\n")
  );

  embed.setColor(page.color);
  embed.setFooter({ text: `Page ${index + 1}/${total} • Mahiru Bot` });
  if (ctx.user?.displayAvatarURL) {
    const avatar = ctx.user.displayAvatarURL({ extension: "png", size: 128 });
    if (avatar) embed.setThumbnail(avatar);
  }

  return embed;
}

function buildButtons(sessionId, index, total, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`leaderboard:${sessionId}:prev`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || index === 0),
    new ButtonBuilder()
      .setCustomId(`leaderboard:${sessionId}:next`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || index >= total - 1),
    new ButtonBuilder()
      .setCustomId(`leaderboard:${sessionId}:close`)
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

const PAGES = [
  {
    title: "TOP LEVEL",
    color: 0x6366f1,
    valueLabel: "Level",
    valueText: (core) => number(core.level || 0),
    rankFn: (cores) => buildRankList(cores, (core) => Number(core.level || 0) * 10_000 + Number(core.xp || 0))
  },
  {
    title: "TOP XP",
    color: 0x8b5cf6,
    valueLabel: "XP",
    valueText: (core) => number(core.xp || 0),
    rankFn: (cores) => buildRankList(cores, (core) => Number(core.xp || 0))
  },
  {
    title: "TOP UANG",
    color: 0x22c55e,
    valueLabel: "Uang",
    valueText: (core) => money(core.uang || 0),
    rankFn: (cores) => buildRankList(cores, (core) => Number(core.uang || 0))
  },
  {
    title: "TOP WEALTH",
    color: 0xf59e0b,
    valueLabel: "Wealth",
    valueText: (core, db) => money(getWealth(core, db)),
    rankFn: (cores, db) => buildRankList(cores, (core) => getWealth(core, db))
  },
  {
    title: "TOP CLAIM",
    color: 0xec4899,
    valueLabel: "Claim",
    valueText: (core, db) => number(getCharacterClaimCount(core, db)),
    rankFn: (cores, db) => buildRankList(cores, (core) => getCharacterClaimCount(core, db))
  }
];

module.exports = {
  name: "leaderboard",
  aliases: ["top", "slb", "topuser", "lb"],
  description: "Top user dan leaderboard ekonomi.",
  async execute({ message, db, commandName }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const cores = db.getAllCores().filter((core) => core?.registered);
    const ctx = {
      user: message.author,
      profile,
      db,
      cores
    };

    const sessionId = uid("lb_");
    let index = 0;
    let closed = false;

    const sent = await message.reply({
      embeds: [buildBoardEmbed(PAGES[index], ctx, index, PAGES.length)],
      components: [buildButtons(sessionId, index, PAGES.length)]
    });

    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.customId.startsWith(`leaderboard:${sessionId}:`)) return;

      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: `Leaderboard ini milik <@${message.author.id}>.`,
          flags: 64
        }).catch(() => {});
        return;
      }

      const action = interaction.customId.split(":")[2];
      if (action === "close") {
        closed = true;
        collector.stop("closed");
        await interaction.update({
          embeds: [buildBoardEmbed(PAGES[index], ctx, index, PAGES.length)],
          components: [buildButtons(sessionId, index, PAGES.length, true)]
        }).catch(() => {});
        return;
      }

      if (action === "prev") {
        index = Math.max(0, index - 1);
      } else if (action === "next") {
        index = Math.min(PAGES.length - 1, index + 1);
      }

      await interaction.update({
        embeds: [buildBoardEmbed(PAGES[index], ctx, index, PAGES.length)],
        components: [buildButtons(sessionId, index, PAGES.length)]
      }).catch(() => {});
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: [buildButtons(sessionId, index, PAGES.length, true)]
        });
      } catch {}
      if (closed) return;
    });

    return sent;
  }
};
