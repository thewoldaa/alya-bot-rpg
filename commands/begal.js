const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");
const { randInt } = require("../utils/random");

module.exports = {
  name: "begal",
  aliases: ["rob", "rampok"],
  description: "Mencoba merampok uang pemain lain. Hati-hati ditangkap polisi Alya!",
  async execute({ client, message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const now = Date.now();

    // Cek apakah pembegal sedang di penjara
    if (profile.jail_until && profile.jail_until > now) {
      const timeLeft = Math.ceil((profile.jail_until - now) / 60000);
      return message.reply({ embeds: [errorEmbed("Dalam Penjara", `Kamu masih di penjara karena ketahuan begal! Tunggu **${timeLeft} menit** lagi.`)] });
    }

    if (args.length === 0) {
      return message.reply({ embeds: [errorEmbed("Format Salah", "Sebutkan siapa yang mau kamu begal!\nContoh: `.begal @budi`")] });
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply({ embeds: [errorEmbed("Target Tidak Ditemukan", "Kamu harus tag/mention orang yang mau dibegal!")] });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ embeds: [errorEmbed("Aneh", "Ngapain kamu begal dirimu sendiri?")] });
    }

    if (targetUser.id === client.user.id) {
      return message.reply({ embeds: [errorEmbed("Berani-beraninya...", "Kamu mau begal Polisi Alya? Langsung masuk penjara aja gih!")] });
    }

    const targetProfile = db.getCoreByDiscordId(targetUser.id);
    if (!targetProfile) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Target belum punya profil RPG!")] });
    }

    const modalBegal = 1000;
    if (profile.uang < modalBegal) {
      return message.reply({ embeds: [errorEmbed("Modal Kurang", `Kamu butuh setidaknya ${money(modalBegal)} sebagai modal (biaya operasional/denda) untuk ngebegal orang!`)] });
    }

    if (targetProfile.uang < 500) {
      return message.reply({ embeds: [errorEmbed("Kasihan", "Targetnya terlalu miskin buat dibegal. Cari mangsa lain yang lebih kaya!")] });
    }

    // Kalkulasi peluang (40% sukses)
    const isSuccess = Math.random() < 0.40;

    if (isSuccess) {
      // Bawa kabur 5% - 15% dari uang target
      const stealPercent = randInt(5, 15) / 100;
      const stolenAmount = Math.floor(targetProfile.uang * stealPercent);

      await db.updateCore(targetProfile.core_id, (core) => {
        core.uang = Math.max(0, (core.uang || 0) - stolenAmount);
        return core;
      });

      await db.updateCore(profile.core_id, (core) => {
        core.uang = (core.uang || 0) + stolenAmount;
        return core;
      });

      return message.channel.send({
        embeds: [
          successEmbed(
            "🥷 BEGAL SUKSES! 🥷",
            `Aksi begal <@${message.author.id}> kepada <@${targetUser.id}> berhasil mulus tanpa jejak!\n\nBerhasil merampas **${money(stolenAmount)}** dari dompet target.`
          )
        ]
      });

    } else {
      // Gagal (60%). Denda uang dan masuk penjara 5 menit.
      const fine = Math.floor(modalBegal * 1.5); // Denda 1500
      const jailTime = 5 * 60 * 1000; // 5 menit

      await db.updateCore(profile.core_id, (core) => {
        core.uang = Math.max(0, (core.uang || 0) - fine);
        core.jail_until = now + jailTime;
        return core;
      });

      // Target dapet kompensasi uang denda (opsional, tapi seru)
      await db.updateCore(targetProfile.core_id, (core) => {
        core.uang = (core.uang || 0) + fine;
        return core;
      });

      return message.channel.send({
        embeds: [
          errorEmbed(
            "🚓 TERCIDUK POLISI ALYA! 🚓",
            `Aksi begal <@${message.author.id}> kepada <@${targetUser.id}> **GAGAL TOTAL**!\n\nPolisi Alya langsung menangkapmu. Kamu didenda **${money(fine)}** (diberikan ke korban sebagai kompensasi) dan dimasukkan ke **PENJARA SELAMA 5 MENIT**!\n*(Selama di penjara, kamu tidak bisa bekerja atau membegal).*`
          )
        ]
      });
    }
  }
};
