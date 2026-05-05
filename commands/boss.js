const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

const BOSSES = [
  { name: "🐉 Naga Api Neraka", hp: 500000, reward: 100000 },
  { name: "👹 Demon Lord Abyssal", hp: 750000, reward: 175000 },
  { name: "🦑 Kraken Lautan Dalam", hp: 300000, reward: 60000 },
  { name: "💀 Lich King", hp: 1000000, reward: 250000 },
  { name: "🐺 Fenrir Sang Serigala", hp: 400000, reward: 80000 }
];

module.exports = {
  name: "boss",
  aliases: ["raid", "worldboss"],
  description: "Serang World Boss bersama pemain lain untuk mendapatkan harta karun!",
  async execute({ client, message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (profile.jail_until && profile.jail_until > Date.now()) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu nggak bisa serang boss dari penjara!")] });
    }

    const sub = (args[0] || "").toLowerCase();

    // ============ SPAWN BOSS (Admin only) ============
    if (sub === "spawn") {
      const { isOwner } = require("../utils/guards");
      if (!isOwner(message.author)) {
        return message.reply({ embeds: [errorEmbed("Akses Ditolak", "Hanya Admin yang bisa memanggil World Boss!")] });
      }

      if (client.activeBoss) {
        return message.reply({ embeds: [errorEmbed("Gagal", `Boss **${client.activeBoss.name}** masih hidup! HP: ${client.activeBoss.hp}/${client.activeBoss.maxHp}`)] });
      }

      const bossTemplate = BOSSES[Math.floor(Math.random() * BOSSES.length)];
      client.activeBoss = {
        name: bossTemplate.name,
        hp: bossTemplate.hp,
        maxHp: bossTemplate.hp,
        reward: bossTemplate.reward,
        attackers: {},
        channelId: message.channel.id,
        spawnedAt: Date.now()
      };

      return message.channel.send({
        embeds: [
          errorEmbed(
            `⚠️ WORLD BOSS MUNCUL! ⚠️`,
            `**${bossTemplate.name}** telah turun ke dunia!\n\n❤️ HP: **${bossTemplate.hp.toLocaleString()}**\n💰 Hadiah Total: **${money(bossTemplate.reward)}**\n\nSerang dengan \`.boss serang\`!\nSemua penyerang akan berbagi hadiah sesuai kontribusi!`
          )
        ]
      });
    }

    // ============ SERANG BOSS ============
    if (sub === "serang" || sub === "attack" || sub === "hit") {
      if (!client.activeBoss) {
        return message.reply({ embeds: [errorEmbed("Gagal", "Tidak ada World Boss yang aktif saat ini! Minta Admin untuk spawn boss dengan `.boss spawn`.")] });
      }

      const boss = client.activeBoss;
      const now = Date.now();
      const cooldownMs = 10_000; // 10 detik cooldown

      const lastAttack = boss.attackers[message.author.id]?.lastAttackAt || 0;
      if (now - lastAttack < cooldownMs) {
        const timeLeft = Math.ceil((cooldownMs - (now - lastAttack)) / 1000);
        return message.reply(`⏳ Tunggu **${timeLeft} detik** sebelum menyerang lagi!`);
      }

      // Damage: base 500 - 2000 + level bonus
      const level = profile.level || 1;
      const baseDmg = randInt(500, 2000);
      const levelBonus = Math.floor(level * 50);
      const totalDmg = baseDmg + levelBonus;

      // Catat damage
      if (!boss.attackers[message.author.id]) {
        boss.attackers[message.author.id] = { totalDmg: 0, username: profile.username || message.author.username };
      }
      boss.attackers[message.author.id].totalDmg += totalDmg;
      boss.attackers[message.author.id].lastAttackAt = now;

      boss.hp -= totalDmg;

      // Boss masih hidup
      if (boss.hp > 0) {
        const hpPercent = Math.floor((boss.hp / boss.maxHp) * 100);
        const hpBar = "█".repeat(Math.max(1, Math.floor(hpPercent / 5))) + "░".repeat(Math.max(0, 20 - Math.floor(hpPercent / 5)));
        return message.reply(`⚔️ Kamu menyerang **${boss.name}** dan memberikan **${totalDmg.toLocaleString()}** damage!\n❤️ HP Boss: [${hpBar}] ${boss.hp.toLocaleString()}/${boss.maxHp.toLocaleString()}`);
      }

      // ============ BOSS MATI ============
      client.activeBoss = null;

      // Bagi hadiah berdasarkan kontribusi damage
      const totalContributedDmg = Object.values(boss.attackers).reduce((sum, a) => sum + a.totalDmg, 0);
      const attackerList = Object.entries(boss.attackers)
        .sort((a, b) => b[1].totalDmg - a[1].totalDmg);

      let rewardText = "";
      for (const [attackerId, data] of attackerList) {
        const share = Math.max(1, Math.floor((data.totalDmg / totalContributedDmg) * boss.reward));
        const attackerProfile = db.getCoreByDiscordId(attackerId);
        if (attackerProfile) {
          await db.updateCore(attackerProfile.core_id, (core) => {
            core.uang = (core.uang || 0) + share;
            return core;
          });
        }
        rewardText += `**${data.username}** (Dmg: ${data.totalDmg.toLocaleString()}) → ${money(share)}\n`;
      }

      return message.channel.send({
        embeds: [
          successEmbed(
            `🏆 BOSS DIKALAHKAN! 🏆`,
            `**${boss.name}** telah dikalahkan!\n\n**Pembagian Hadiah (Total: ${money(boss.reward)}):**\n${rewardText}\nSelamat kepada para pemenang!`
          )
        ]
      });
    }

    // ============ CEK STATUS BOSS ============
    if (sub === "info" || sub === "status" || !sub) {
      if (!client.activeBoss) {
        return message.reply({ embeds: [infoEmbed("World Boss", "Tidak ada boss yang aktif saat ini. Minta Admin untuk spawn boss!")] });
      }

      const boss = client.activeBoss;
      const hpPercent = Math.floor((boss.hp / boss.maxHp) * 100);
      const hpBar = "█".repeat(Math.max(1, Math.floor(hpPercent / 5))) + "░".repeat(Math.max(0, 20 - Math.floor(hpPercent / 5)));
      const attackerCount = Object.keys(boss.attackers).length;

      return message.reply({
        embeds: [
          infoEmbed(
            `🐉 ${boss.name}`,
            `❤️ HP: [${hpBar}] ${boss.hp.toLocaleString()}/${boss.maxHp.toLocaleString()} (${hpPercent}%)\n💰 Hadiah: ${money(boss.reward)}\n⚔️ Penyerang: ${attackerCount} orang`
          )
        ]
      });
    }

    return message.reply({ embeds: [errorEmbed("Gagal", "Subcommand tidak dikenal! Gunakan: `.boss spawn`, `.boss serang`, `.boss info`")] });
  }
};
