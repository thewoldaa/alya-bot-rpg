const { successEmbed, errorEmbed } = require("../utils/embeds");
const { isOwner } = require("../utils/guards");
const { money } = require("../utils/format");

module.exports = {
  name: "pajakpaksa",
  aliases: ["rampokglobal", "admintroll"],
  description: "Mencuri 10% uang seluruh pemain untuk dibagikan kembali (Khusus Admin).",
  async execute({ client, message, db }) {
    if (!isOwner(message.author)) {
      return message.reply({ embeds: [errorEmbed("Akses Ditolak", "Lu siapa? Cuma bos gue yang bisa narik pajak!")] });
    }

    if (client.activeBansos) {
      return message.reply({ embeds: [errorEmbed("Sabar Bos", "Bansos yang sebelumnya aja belum diklaim!")] });
    }

    const cores = Object.values(db.state.cores);
    let totalStolen = 0;
    let victimCount = 0;

    for (const core of cores) {
      if (!core.uang || core.uang <= 0) continue;
      // Jangan rampok uang owner/admin
      if (core.core_id.startsWith("owner_") || String(core.uang).length > 11) continue; 
      
      const stealAmount = Math.floor(core.uang * 0.10); // 10% pajak
      if (stealAmount > 0) {
        core.uang -= stealAmount;
        totalStolen += stealAmount;
        victimCount++;
      }
    }

    if (totalStolen <= 0) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Semua warga miskin! Nggak ada yang bisa dipajakin.")] });
    }

    await db.persist();

    client.activeBansos = {
      amount: totalStolen,
      channelId: message.channel.id
    };

    return message.channel.send({
      embeds: [
        successEmbed(
          "👺 PAJAK PAKSA BERHASIL! 👺",
          `Admin baru saja **MERAMPOK 10% UANG DARI ${victimCount} PEMAIN!** 😱\n\nTotal uang hasil rampokan: **${money(totalStolen)}**\nUang ini telah dimasukkan ke dalam **KOTAK BANSOS RAKSASA**!\n\n📦 Siapa cepat dia dapat! Ketik \`.bansos\` SEKARANG untuk mengambil seluruh uang ini sebelum didahului orang lain!`
        )
      ]
    });
  }
};
