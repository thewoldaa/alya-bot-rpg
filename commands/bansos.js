const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

module.exports = {
  name: "bansos",
  aliases: ["claimbansos", "rampokbalik"],
  description: "Mengklaim uang jackpot dari kotak bansos hasil pajak paksa.",
  async execute({ client, message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    if (!client.activeBansos) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Lagi nggak ada pembagian bansos! Kerja woi!")] }).catch(() => {});
    }

    if (client.activeBansos.channelId !== message.channel.id) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Bansosnya dibagikan di tempat lain!")] }).catch(() => {});
    }

    const amount = client.activeBansos.amount;
    
    // Matikan bansos agar tidak diambil orang lain (race condition)
    client.activeBansos = null;

    // Berikan uang ke player yang beruntung
    await db.updateCore(profile.core_id, (core) => {
      core.uang = (core.uang || 0) + amount;
      return core;
    });

    return message.channel.send({
      embeds: [
        successEmbed(
          "🎉 BANSOS BERHASIL DIKLAIM! 🎉",
          `Selamat kepada <@${message.author.id}>!\n\nKamu berhasil menyerobot kotak bansos dan mendapatkan seluruh uang pajak sebesar **${money(amount)}**!\n\n*(Pemain lain menangis melihat ini...)*`
        )
      ]
    });
  }
};
