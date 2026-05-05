const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

// Menyimpan state duel yang sedang menunggu konfirmasi
const pendingDuels = new Map();

module.exports = {
  name: "duel",
  aliases: ["fight", "tarung"],
  description: "Menantang pemain lain duel dengan taruhan uang.",
  async execute({ client, message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (profile.jail_until && profile.jail_until > Date.now()) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Kamu nggak bisa duel dari dalam penjara!")] });
    }

    if (args.length < 2) {
      return message.reply({ embeds: [errorEmbed("Format Salah", "Gunakan format: `.duel @user <taruhan>`\nContoh: `.duel @budi 1000`\n\nUntuk menerima tantangan: `.duel accept`\nUntuk menolak: `.duel decline`")] });
    }

    // Jika menerima duel
    if (args[0].toLowerCase() === "accept" || args[0].toLowerCase() === "terima") {
      const duelId = pendingDuels.get(message.author.id);
      if (!duelId) return message.reply({ embeds: [errorEmbed("Gagal", "Tidak ada tantangan duel untukmu saat ini.")] });

      const challengerId = duelId.challenger;
      const bet = duelId.bet;
      
      const challengerProfile = db.getCoreByDiscordId(challengerId);
      const targetProfile = db.getCoreByDiscordId(message.author.id);

      pendingDuels.delete(message.author.id);

      if ((challengerProfile.uang || 0) < bet || (targetProfile.uang || 0) < bet) {
        return message.reply({ embeds: [errorEmbed("Batal", "Salah satu dari kalian sudah miskin dan tidak punya cukup uang untuk taruhan ini! Duel dibatalkan.")] });
      }

      // Roll dadu
      const challengerRoll = randInt(1, 100) + (challengerProfile.level || 1);
      const targetRoll = randInt(1, 100) + (targetProfile.level || 1);

      let winner, loser, winnerRoll, loserRoll;
      if (challengerRoll > targetRoll) {
        winner = challengerProfile; loser = targetProfile;
        winnerRoll = challengerRoll; loserRoll = targetRoll;
      } else if (targetRoll > challengerRoll) {
        winner = targetProfile; loser = challengerProfile;
        winnerRoll = targetRoll; loserRoll = challengerRoll;
      } else {
        return message.channel.send({ embeds: [infoEmbed("Duel Seri", "Wow! Kekuatan kalian seimbang. Tidak ada yang menang atau kalah.")] });
      }

      // Potong uang kalah, tambah uang menang
      await db.updateCore(loser.core_id, (core) => {
        core.uang = Math.max(0, (core.uang || 0) - bet);
        return core;
      });

      await db.updateCore(winner.core_id, (core) => {
        core.uang = (core.uang || 0) + bet;
        return core;
      });

      return message.channel.send({
        embeds: [
          successEmbed(
            "⚔️ HASIL DUEL ⚔️",
            `**${winner.username}** (Skor: ${winnerRoll}) MENGALAHKAN **${loser.username}** (Skor: ${loserRoll})!\n\nPemenang merampas **${money(bet)}** dari yang kalah!`
          )
        ]
      });
    }

    // Jika menolak duel
    if (args[0].toLowerCase() === "decline" || args[0].toLowerCase() === "tolak") {
      if (pendingDuels.has(message.author.id)) {
        pendingDuels.delete(message.author.id);
        return message.reply({ embeds: [successEmbed("Batal", "Kamu menolak tantangan duel tersebut.")] });
      } else {
        return message.reply({ embeds: [errorEmbed("Gagal", "Tidak ada tantangan duel untukmu saat ini.")] });
      }
    }

    // Jika menantang
    const targetUser = message.mentions.users.first();
    const bet = parseInt(args[1]);

    if (!targetUser) return message.reply({ embeds: [errorEmbed("Target Tidak Ditemukan", "Tag orang yang mau diajak duel!")] });
    if (targetUser.id === message.author.id) return message.reply({ embeds: [errorEmbed("Aneh", "Ngapain duel sama diri sendiri?")] });
    if (targetUser.bot) return message.reply({ embeds: [errorEmbed("Gagal", "Kamu nggak bisa duel sama bot!")] });
    if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed("Gagal", "Jumlah taruhan harus berupa angka dan lebih dari 0!")] });

    if ((profile.uang || 0) < bet) {
      return message.reply({ embeds: [errorEmbed("Miskin", `Uangmu nggak cukup buat taruhan ${money(bet)}!`)] });
    }

    const targetProfile = db.getCoreByDiscordId(targetUser.id);
    if (!targetProfile) return message.reply({ embeds: [errorEmbed("Gagal", "Target belum punya profil RPG!")] });

    if ((targetProfile.uang || 0) < bet) {
      return message.reply({ embeds: [errorEmbed("Kasihan", `Target terlalu miskin buat taruhan ${money(bet)}!`)] });
    }

    if (pendingDuels.has(targetUser.id)) {
      return message.reply({ embeds: [errorEmbed("Sibuk", "Target sedang menerima tantangan duel dari orang lain!")] });
    }

    pendingDuels.set(targetUser.id, {
      challenger: message.author.id,
      bet: bet,
      timestamp: Date.now()
    });

    // Otomatis hapus tantangan setelah 2 menit
    setTimeout(() => {
      if (pendingDuels.has(targetUser.id)) {
        pendingDuels.delete(targetUser.id);
      }
    }, 120000);

    return message.channel.send({
      embeds: [
        infoEmbed(
          "⚔️ TANTANGAN DUEL ⚔️",
          `<@${targetUser.id}>! Kamu ditantang duel oleh <@${message.author.id}> dengan taruhan **${money(bet)}**!\n\nKetik \`.duel accept\` untuk melawan, atau \`.duel decline\` untuk kabur sebagai pengecut!\n*(Tantangan ini hangus dalam 2 menit)*`
        )
      ]
    });
  }
};
