const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const { uid } = require("./random");

const COLORS = {
  intro: 0x7c3aed,
  creator: 0xf59e0b,
  staff: 0xef4444,
  anime: 0xec4899,
  media: 0x3b82f6,
  group: 0x22c55e,
  admin: 0xf97316,
  pray: 0x14b8a6,
  game: 0x6366f1,
  help: 0x8b5cf6
};

function statBox(profile, user) {
  const username = profile?.username || user?.username || "Guest";
  const level = Number(profile?.level || 0);
  const xp = Number(profile?.xp || 0);

  return [
    "╭───────────────────────",
    `│─≽ Username   : ${username}`,
    `│─≽ Level      : ${level}`,
    `│─≽ Xp         : ${xp}`,
    "╰──────────────────────"
  ].join("\n");
}

function buildAsciiSection(title, lines, note = "") {
  const content = Array.isArray(lines) ? lines : [lines];
  const noteLine = note ? `\n║│    ${note}` : "";

  return [
    `╔════「 ${title} 」═════`,
    "║╭───────────────────────",
    ...content.map((line) => `║│─≽ ${line}`),
    `${noteLine}`.trimEnd(),
    "║╰───────────────────────",
    "╚════════════════════════"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPageEmbed(page, context, index, total) {
  const embed = new EmbedBuilder()
    .setColor(page.color || COLORS.help)
    .setTitle(page.title)
    .setDescription(page.body(context))
    .setFooter({ text: `Page ${index + 1}/${total} • Mahiru Bot` });

  if (context.user?.displayAvatarURL) {
    const avatar = context.user.displayAvatarURL({ extension: "png", size: 128 });
    if (avatar) {
      embed.setThumbnail(avatar);
    }
  }

  return embed;
}

function buildButtons(sessionId, index, total, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`menu:${sessionId}:prev`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || index === 0),
    new ButtonBuilder()
      .setCustomId(`menu:${sessionId}:next`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || index >= total - 1),
    new ButtonBuilder()
      .setCustomId(`menu:${sessionId}:close`)
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

const FULL_MENU_PAGES = [
  {
    key: "intro",
    title: "Halo Saya bot mahiru",
    color: COLORS.intro,
    body: (ctx) => [
      statBox(ctx.profile, ctx.user),
      "",
      "Menu ini hanya menampilkan fitur yang memang sudah ada di bot.",
      ctx.profile
        ? "Gunakan tombol di bawah untuk pindah kategori."
        : "Kamu belum register. Gunakan `/register <nama>` atau `.register <nama>` untuk mulai.",
      "",
      "Quick Start:",
      "─≽ `/register <nama>` atau `.register <nama>`",
      "─≽ `/login <id>` untuk shared data",
      "─≽ `.menu` atau `.m` untuk buka menu",
      "─≽ `.work` butuh job, hunger, dan cooldown 1 menit"
    ].join("\n")
  },
  {
    key: "start",
    title: "START MENU",
    color: COLORS.creator,
    body: () => buildAsciiSection("START MENU", [
      "/register <nama>",
      ".register <nama>",
      "/login <id>",
      ".menu",
      ".m",
      ".help",
      ".profil",
      ".money",
      ".inv",
      ".afk <alasan|off>"
    ], "Akses awal dan utility dasar.")
  },
  {
    key: "rpg",
    title: "RPG MENU",
    color: COLORS.game,
    body: () => buildAsciiSection("RPG MENU", [
      ".job",
      ".mk",
      ".work",
      ".gear",
      ".equip <gear>",
      ".unequip <slot>",
      ".enchant <slot>",
      ".craft <item>",
      ".expedition <start|claim>",
      ".shop",
      ".s <barang/nomor> [jumlah]",
      ".gacha",
      ".slot <bet>",
      ".togel <angka> <bet>"
    ], "Progress, equipment, kerja, dan ekspedisi.")
  },
  {
    key: "economy",
    title: "ECONOMY MENU",
    color: COLORS.media,
    body: () => buildAsciiSection("ECONOMY MENU", [
      ".money",
      ".profil",
      ".pay <user> <jumlah>",
      ".ind",
      ".ind chart",
      ".slb",
      ".beli <saham> <jumlah>",
      ".jual <saham> <jumlah>",
      ".invest <pasar|portfolio|beli|jual>",
      ".blackmarket <beli>",
      ".redeem <code>"
    ], "Uang, transfer, market, saham, dan redeem.")
  },
  {
    key: "social",
    title: "SOCIAL MENU",
    color: COLORS.group,
    body: () => buildAsciiSection("SOCIAL MENU", [
      ".belirumah <tipe>",
      ".lamar <character>",
      ".pd 1-4",
      ".anak",
      ".nkkand",
      ".moodboard [yes|no]",
      ".cheerup <@user>",
      "Act, Beri Makan, dan Beri Uang lewat tombol di `.pd`"
    ], "Rumah, pasangan, anak, mood, dan interaksi sosial.")
  },
  {
    key: "special",
    title: "SPECIAL MENU",
    color: COLORS.anime,
    body: () => buildAsciiSection("SPECIAL MENU", [
      ".character <id/nama>",
      ".settheme <tema>",
      ".showcase <slot>",
      ".profil",
      ".help",
      ".menu",
      ".m"
    ], "Fitur pencarian, visual tema, dan tampilan cepat.")
  },
  {
    key: "owner",
    title: "OWNER & SERVER",
    color: COLORS.admin,
    body: () => buildAsciiSection("OWNER & SERVER", [
      ".addmoney <user> <jumlah>",
      ".buatredeem money <jumlah> [kode]",
      ".buatredeem limit <jumlah> [kode]",
      ".buatredeem item <itemKey> <jumlah> [kode]",
      ".set pd pp <slot>",
      ".lockdown",
      ".audit",
      "/clear [amount] [channel]",
      "/setchat",
      "/setuserlimit",
      "/resetserver"
    ], "Khusus owner, keamanan server, dan kontrol.")
  }
];

const HELP_PAGES = [
  {
    key: "help-start",
    title: "Bantuan Mahiru",
    color: COLORS.help,
    body: (ctx) => [
      statBox(ctx.profile, ctx.user),
      "",
      "Command inti yang tersedia:",
      "─≽ `/register <nama>` atau `.register <nama>`",
      "─≽ `/login <id>`",
      "─≽ `.menu` atau `.m`",
      "",
      "Aturan utama:",
      "─≽ Semua command selain register/login butuh akun terdaftar",
      "─≽ `.work` punya cooldown 1 menit",
      "─≽ `.work` butuh job aktif dan hunger cukup"
    ].join("\n")
  },
  {
    key: "help-rpg",
    title: "RPG & Economy",
    color: COLORS.game,
    body: () => buildAsciiSection("RPG & ECONOMY", [
      ".job",
      ".mk",
      ".work",
      ".gear",
      ".equip <gear>",
      ".unequip <slot>",
      ".enchant <slot>",
      ".craft <item>",
      ".expedition <start|claim>",
      ".shop",
      ".s <barang/nomor> [jumlah]",
      ".gacha",
      ".inv",
      ".money",
      ".pay <user> <jumlah>",
      ".slot <bet>",
      ".togel <angka> <bet>",
      ".ind",
      ".ind chart",
      ".slb",
      ".beli <saham> <jumlah>",
      ".jual <saham> <jumlah>",
      ".invest <pasar|portfolio|beli|jual>",
      ".blackmarket <beli>",
      ".redeem <code>"
    ], "Gunakan `.menu` untuk daftar yang lebih rapi per kategori.")
  },
  {
    key: "help-social",
    title: "Social & Lainnya",
    color: COLORS.group,
    body: () => buildAsciiSection("SOCIAL & LAINNYA", [
      ".belirumah <tipe>",
      ".lamar <character>",
      ".pd 1-4",
      ".anak",
      ".nkkand",
      ".moodboard [yes|no]",
      ".cheerup <@user>",
      "Act, Beri Makan, dan Beri Uang lewat tombol di `.pd`",
      ".afk <alasan|off>",
      ".character <id/nama>",
      ".settheme <tema>",
      ".showcase <slot>"
    ], "Fitur sosial, roleplay, dan pencarian karakter.")
  },
  {
    key: "help-owner",
    title: "Owner & Server",
    color: COLORS.admin,
    body: () => buildAsciiSection("OWNER & SERVER", [
      ".addmoney <user> <jumlah>",
      ".buatredeem money <jumlah> [kode]",
      ".buatredeem limit <jumlah> [kode]",
      ".buatredeem item <itemKey> <jumlah> [kode]",
      ".set pd pp <slot>",
      ".lockdown",
      ".audit",
      "/clear [amount] [channel]",
      "/setchat",
      "/setuserlimit",
      "/resetserver"
    ], "Command khusus owner dan admin server.")
  }
];

async function sendPagedMenu(message, pages, context, options = {}) {
  if (!Array.isArray(pages) || !pages.length) {
    throw new Error("Pages tidak boleh kosong.");
  }

  const timeoutMs = Number(options.timeoutMs || 60_000);
  const sessionId = uid("menu_");
  let index = Math.max(0, Math.min(Number(options.startPage || 0), pages.length - 1));
  let closed = false;

  const sent = await message.reply({
    embeds: [buildPageEmbed(pages[index], context, index, pages.length)],
    components: [buildButtons(sessionId, index, pages.length)]
  });

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeoutMs
  });

  collector.on("collect", async (interaction) => {
    if (!interaction.customId.startsWith(`menu:${sessionId}:`)) return;

      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: `Menu ini milik <@${message.author.id}>.`,
          flags: 64
        }).catch(() => {});
        return;
      }

    const action = interaction.customId.split(":")[2];
    if (action === "close") {
      closed = true;
      collector.stop("closed");
      await interaction.update({
        embeds: [buildPageEmbed(pages[index], context, index, pages.length)],
        components: [buildButtons(sessionId, index, pages.length, true)]
      }).catch(() => {});
      return;
    }

    if (action === "prev") {
      index = Math.max(0, index - 1);
    } else if (action === "next") {
      index = Math.min(pages.length - 1, index + 1);
    }

    await interaction.update({
      embeds: [buildPageEmbed(pages[index], context, index, pages.length)],
      components: [buildButtons(sessionId, index, pages.length)]
    }).catch(() => {});
  });

  collector.on("end", async () => {
    if (closed) {
      try {
        await sent.edit({
          components: [buildButtons(sessionId, index, pages.length, true)]
        });
      } catch {}
      return;
    }

    try {
      await sent.edit({
        components: [buildButtons(sessionId, index, pages.length, true)]
      });
    } catch {}
  });

  return sent;
}

function buildMenuPages(context) {
  return FULL_MENU_PAGES;
}

function buildHelpPages(context) {
  return HELP_PAGES;
}

module.exports = {
  buildMenuPages,
  buildHelpPages,
  sendPagedMenu
};
