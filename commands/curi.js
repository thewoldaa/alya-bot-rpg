const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

module.exports = {
  name: "curi",
  aliases: ["steal", "copet"],
  description: "Mencopet pemain lain (resiko kecil, hasil kecil).",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (profile.jail_until && profile.jail_until > Date.now()) {
      const timeLeft = Math.ceil((profile.jail_until - Date.now()) / 60000);
      return message.reply({ embeds: [errorEmbed("Dalam Penjara", `Masih di penjara! Tunggu **${timeLeft} menit**.`)] });
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply({ embeds: [errorEmbed("Gagal", "Tag orang yang mau kamu copet!\nContoh: `.curi @budi`")] });
    if (targetUser.id === message.author.id) return message.reply({ embeds: [errorEmbed("Aneh", "Ngapain copet diri sendiri?")] });
    if (targetUser.bot) return message.reply({ embeds: [errorEmbed("Gagal", "Nggak bisa copet bot!")] });

    const targetProfile = db.getCoreByDiscordId(targetUser.id);
    if (!targetProfile) return message.reply({ embeds: [errorEmbed("Gagal", "Target belum punya profil!")] });

    if ((targetProfile.uang || 0) < 100) {
      return message.reply({ embeds: [errorEmbed("Kasihan", "Targetnya terlalu miskin, nggak ada yang bisa dicopet.")] });
    }

    // 55% berhasil (lebih gampang dari begal, tapi hasilnya juga kecil)
    const isSuccess = Math.random() < 0.55;

    if (isSuccess) {
      const stolen = randInt(50, Math.min(500, Math.floor(targetProfile.uang * 0.05))); // Max 5% atau 500

      await db.updateCore(targetProfile.core_id, (core) => {
        core.uang = Math.max(0, (core.uang || 0) - stolen);
        return core;
      });

      await db.updateCore(profile.core_id, (core) => {
        core.uang = (core.uang || 0) + stolen;
        return core;
      });

      return message.reply({
        embeds: [
          successEmbed(
            "🤏 Copet Sukses",
            `Kamu diam-diam mencopet dompet <@${targetUser.id}> dan mendapatkan **${money(stolen)}**! Ssst jangan bilang siapa-siapa~`
          )
        ]
      });
    } else {
      // Gagal tapi denda kecil (tidak masuk penjara)
      const fine = randInt(100, 300);

      await db.updateCore(profile.core_id, (core) => {
        core.uang = Math.max(0, (core.uang || 0) - fine);
        return core;
      });

      return message.reply({
        embeds: [
          errorEmbed(
            "Ketahuan!",
            `Kamu ketahuan mencopet <@${targetUser.id}>! Orang-orang marah dan kamu didenda **${money(fine)}** oleh warga.`
          )
        ]
      });
    }
  }
};
