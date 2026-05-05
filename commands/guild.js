const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

const GUILD_CREATE_COST = 50000;
const GUILD_MAX_MEMBERS = 20;

module.exports = {
  name: "guild",
  aliases: ["clan", "geng"],
  description: "Sistem guild / clan. Subcommands: create, join, leave, info, donasi, members.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const sub = (args[0] || "").toLowerCase();

    if (!sub || sub === "help") {
      return message.reply({
        embeds: [
          infoEmbed(
            "🛡️ Sistem Guild",
            "**Perintah Guild:**\n" +
            "`.guild create <nama>` - Bikin guild baru (biaya: 50.000)\n" +
            "`.guild join <nama>` - Gabung ke guild\n" +
            "`.guild leave` - Keluar dari guild\n" +
            "`.guild info` - Info guild kamu\n" +
            "`.guild donasi <jumlah>` - Sumbang uang ke kas guild\n" +
            "`.guild members` - Lihat daftar anggota"
          )
        ]
      });
    }

    // =================== CREATE ===================
    if (sub === "create" || sub === "buat") {
      if (profile.guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Kamu sudah punya guild! Keluar dulu pakai `.guild leave`.")] });
      }

      const guildName = args.slice(1).join(" ").trim();
      if (!guildName || guildName.length < 2 || guildName.length > 20) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Nama guild harus 2-20 karakter!")] });
      }

      const guildKey = guildName.toLowerCase().replace(/\s+/g, "_");
      if (db.state.guilds[guildKey]) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Nama guild itu sudah dipakai orang lain!")] });
      }

      if ((profile.uang || 0) < GUILD_CREATE_COST) {
        return message.reply({ embeds: [errorEmbed("Miskin", `Kamu butuh ${money(GUILD_CREATE_COST)} untuk bikin guild!`)] });
      }

      // Buat guild
      db.state.guilds[guildKey] = {
        name: guildName,
        key: guildKey,
        leader: message.author.id,
        members: [message.author.id],
        treasury: 0,
        level: 1,
        xp: 0,
        created_at: Date.now()
      };

      await db.updateCore(profile.core_id, (core) => {
        core.uang -= GUILD_CREATE_COST;
        core.guild = guildKey;
        return core;
      });

      await db.persist();

      return message.reply({
        embeds: [
          successEmbed(
            "🛡️ Guild Dibuat!",
            `Guild **${guildName}** berhasil didirikan!\nKamu adalah pemimpinnya.\nBiaya pendirian: ${money(GUILD_CREATE_COST)}\n\nAjak teman-temanmu bergabung lewat \`.guild join ${guildName}\`!`
          )
        ]
      });
    }

    // =================== JOIN ===================
    if (sub === "join" || sub === "gabung") {
      if (profile.guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Kamu sudah ada di guild! Keluar dulu pakai `.guild leave`.")] });
      }

      const guildName = args.slice(1).join(" ").trim();
      const guildKey = guildName.toLowerCase().replace(/\s+/g, "_");
      const guild = db.state.guilds[guildKey];

      if (!guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Guild itu nggak ada! Cek nama guildnya lagi.")] });
      }

      if (guild.members.length >= GUILD_MAX_MEMBERS) {
        return message.reply({ embeds: [errorEmbed("Penuh", "Guild itu sudah penuh! Kapasitas max: " + GUILD_MAX_MEMBERS + " orang.")] });
      }

      guild.members.push(message.author.id);

      await db.updateCore(profile.core_id, (core) => {
        core.guild = guildKey;
        return core;
      });

      await db.persist();

      return message.reply({
        embeds: [
          successEmbed("Bergabung!", `Kamu berhasil bergabung ke guild **${guild.name}**! Selamat datang!`)
        ]
      });
    }

    // =================== LEAVE ===================
    if (sub === "leave" || sub === "keluar") {
      if (!profile.guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Kamu nggak punya guild.")] });
      }

      const guild = db.state.guilds[profile.guild];
      if (!guild) {
        await db.updateCore(profile.core_id, (core) => { core.guild = null; return core; });
        return message.reply({ embeds: [successEmbed("Keluar", "Guild kamu sudah tidak ada. Status guild dihapus.")] });
      }

      // Jika leader keluar, bubarkan guild
      if (guild.leader === message.author.id) {
        // Hapus guild dari semua member
        for (const memberId of guild.members) {
          const memberCore = db.getCoreByDiscordId(memberId);
          if (memberCore) {
            await db.updateCore(memberCore.core_id, (core) => { core.guild = null; return core; });
          }
        }
        delete db.state.guilds[profile.guild];
        await db.persist();
        return message.reply({ embeds: [successEmbed("Guild Bubar", `Guild **${guild.name}** telah dibubarkan karena pemimpin pergi!`)] });
      }

      // Member biasa keluar
      guild.members = guild.members.filter(id => id !== message.author.id);
      await db.updateCore(profile.core_id, (core) => { core.guild = null; return core; });
      await db.persist();

      return message.reply({ embeds: [successEmbed("Keluar", `Kamu keluar dari guild **${guild.name}**.`)] });
    }

    // =================== INFO ===================
    if (sub === "info") {
      if (!profile.guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Kamu belum bergabung ke guild manapun!")] });
      }

      const guild = db.state.guilds[profile.guild];
      if (!guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Data guild tidak ditemukan.")] });
      }

      const xpNeeded = guild.level * 5000;

      return message.reply({
        embeds: [
          infoEmbed(
            `🛡️ ${guild.name}`,
            `**Level:** ${guild.level} (XP: ${guild.xp}/${xpNeeded})\n` +
            `**Kas:** ${money(guild.treasury)}\n` +
            `**Anggota:** ${guild.members.length}/${GUILD_MAX_MEMBERS}\n` +
            `**Pemimpin:** <@${guild.leader}>\n` +
            `**Didirikan:** <t:${Math.floor(guild.created_at / 1000)}:R>`
          )
        ]
      });
    }

    // =================== DONASI ===================
    if (sub === "donasi" || sub === "donate") {
      if (!profile.guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Kamu belum punya guild!")] });
      }

      const guild = db.state.guilds[profile.guild];
      if (!guild) return message.reply({ embeds: [errorEmbed("Error", "Guild tidak ditemukan.")] });

      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Jumlah donasi harus berupa angka > 0!")] });
      }

      if ((profile.uang || 0) < amount) {
        return message.reply({ embeds: [errorEmbed("Miskin", "Uang tunai kamu nggak cukup buat donasi segitu!")] });
      }

      guild.treasury += amount;
      guild.xp += Math.floor(amount / 10); // 10 uang = 1 XP guild

      // Level up guild
      const xpNeeded = guild.level * 5000;
      if (guild.xp >= xpNeeded) {
        guild.xp -= xpNeeded;
        guild.level += 1;
      }

      await db.updateCore(profile.core_id, (core) => {
        core.uang -= amount;
        return core;
      });

      await db.persist();

      return message.reply({
        embeds: [
          successEmbed(
            "Donasi Guild",
            `Kamu menyumbangkan **${money(amount)}** ke kas guild **${guild.name}**!\nGuild XP +${Math.floor(amount / 10)}\nKas guild sekarang: ${money(guild.treasury)}`
          )
        ]
      });
    }

    // =================== MEMBERS ===================
    if (sub === "members" || sub === "anggota") {
      if (!profile.guild) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Kamu belum punya guild!")] });
      }

      const guild = db.state.guilds[profile.guild];
      if (!guild) return message.reply({ embeds: [errorEmbed("Error", "Guild tidak ditemukan.")] });

      const memberList = guild.members.map((id, i) => {
        const isLeader = id === guild.leader ? " 👑" : "";
        return `${i + 1}. <@${id}>${isLeader}`;
      }).join("\n");

      return message.reply({
        embeds: [
          infoEmbed(
            `Anggota ${guild.name}`,
            `Total: ${guild.members.length}/${GUILD_MAX_MEMBERS}\n\n${memberList}`
          )
        ]
      });
    }

    return message.reply({ embeds: [errorEmbed("Gagal", "Subcommand tidak dikenal! Ketik `.guild help`.")] });
  }
};
