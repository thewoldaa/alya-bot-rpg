const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { randInt } = require("../utils/random");
const { money, timeAgo } = require("../utils/format");

const EXPEDITION_TIME = 2 * 60 * 60 * 1000; // 2 hours

module.exports = {
  name: "expedition",
  aliases: ["ekspedisi"],
  description: "Mengirim karakter berpetualang selama beberapa jam untuk mencari harta.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const expeditions = profile.expeditions || [];
    const activeExpedition = expeditions.find(e => e.active);

    const action = args[0]?.toLowerCase();

    if (action === "start") {
      if (activeExpedition) {
        return message.reply({
          embeds: [errorEmbed("Ekspedisi Berjalan", "Kamu sudah memiliki tim yang sedang dalam ekspedisi!")]
        });
      }

      const slot = Number(args[1]);
      const claims = db.getCharacterClaimsByCore(profile.core_id);
      
      if (!Number.isInteger(slot) || slot < 1 || slot > claims.length) {
        return message.reply({
          embeds: [errorEmbed("Slot Tidak Valid", "Pilih slot karakter untuk dikirim. Contoh: `.expedition start 1`")]
        });
      }

      const character = claims[slot - 1];

      await db.updateCore(profile.core_id, (core) => {
        core.expeditions = [{
          active: true,
          startTime: Date.now(),
          endTime: Date.now() + EXPEDITION_TIME,
          characterKey: character.key,
          characterName: character.character ? character.character.name : "Unknown"
        }];
        return core;
      });

      return message.reply({
        embeds: [
          successEmbed(
            "Ekspedisi Dimulai 🏕️",
            `**${character.character ? character.character.name : "Unknown"}** telah berangkat ekspedisi!\nMereka akan kembali dalam **2 jam**. Gunakan \`.expedition claim\` nanti.`
          )
        ]
      });
    }

    if (action === "claim") {
      if (!activeExpedition) {
        return message.reply({
          embeds: [errorEmbed("Tidak Ada Ekspedisi", "Kamu tidak memiliki ekspedisi yang sedang berjalan.")]
        });
      }

      const now = Date.now();
      if (now < activeExpedition.endTime) {
        const remainingMs = activeExpedition.endTime - now;
        const remainingMin = Math.ceil(remainingMs / 60000);
        return message.reply({
          embeds: [infoEmbed("Belum Kembali", `Tim kamu masih di jalan. Kembali dalam **${remainingMin} menit**.`)]
        });
      }

      // Calculate rewards
      const rewardMoney = randInt(1000, 5000);
      const rewardXp = randInt(50, 150);

      await db.updateCore(profile.core_id, (core) => {
        core.expeditions = []; // clear
        core.uang = (core.uang || 0) + rewardMoney;
        core.xp = (core.xp || 0) + rewardXp;
        // Check level up
        while (core.xp >= db.getXpNeed(core.level)) {
          core.xp -= db.getXpNeed(core.level);
          core.level += 1;
        }
        return core;
      });

      return message.reply({
        embeds: [
          successEmbed(
            "Ekspedisi Selesai! 🎉",
            `**${activeExpedition.characterName}** telah kembali membawa hasil!\n\n**Hadiah:**\n💰 ${money(rewardMoney)}\n✨ ${rewardXp} XP`
          )
        ]
      });
    }

    // Default status
    if (activeExpedition) {
      const now = Date.now();
      if (now >= activeExpedition.endTime) {
        return message.reply({
          embeds: [successEmbed("Ekspedisi Selesai", "Tim ekspedisimu sudah kembali! Ketik `.expedition claim` untuk mengambil hadiahnya.")]
        });
      } else {
        const remainingMs = activeExpedition.endTime - now;
        const remainingMin = Math.ceil(remainingMs / 60000);
        return message.reply({
          embeds: [infoEmbed("Status Ekspedisi", `**${activeExpedition.characterName}** sedang berpetualang.\nWaktu tersisa: **${remainingMin} menit**.`)]
        });
      }
    }

    return message.reply({
      embeds: [infoEmbed("Ekspedisi", "Kirim karaktermu berpetualang selama 2 jam untuk mendapatkan harta!\n\n**Command:**\n`.expedition start <slot>`\n`.expedition claim`")]
    });
  }
};
