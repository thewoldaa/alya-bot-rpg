const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");
const { isOwner } = require("../utils/guards");
const { money } = require("../utils/format");

module.exports = {
  name: "hujanuang",
  aliases: ["rain", "giveaway"],
  description: "Menebar uang dari langit (Khusus Admin).",
  async execute({ client, message, args }) {
    if (!isOwner(message.author)) {
      return message.reply({ embeds: [errorEmbed("Akses Ditolak", "Hanya Admin yang bisa menciptakan hujan uang!")] });
    }

    const totalMoney = parseInt(args[0]);
    const maxWinners = parseInt(args[1]);

    if (isNaN(totalMoney) || totalMoney <= 0 || isNaN(maxWinners) || maxWinners <= 0) {
      return message.reply({ embeds: [errorEmbed("Format Salah", "Gunakan format: `.hujanuang <total_uang> <jumlah_pemenang>`\nContoh: `.hujanuang 1000000 5`")] });
    }

    if (client.activeRain) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Hujan uang sebelumnya masih belum habis dipungut!")] });
    }

    // Split money into random chunks
    const chunks = [];
    let remaining = totalMoney;
    for (let i = 0; i < maxWinners - 1; i++) {
      // Random portion between 1% and (remaining/maxWinners * 2) to ensure unevenness
      const maxChunk = Math.floor(remaining / (maxWinners - i) * 1.5);
      const minChunk = Math.max(1, Math.floor(totalMoney * 0.05));
      let chunk = Math.floor(Math.random() * (maxChunk - minChunk + 1)) + minChunk;
      if (chunk >= remaining) chunk = Math.max(1, Math.floor(remaining / 2));
      chunks.push(chunk);
      remaining -= chunk;
    }
    chunks.push(remaining);

    // Shuffle chunks
    chunks.sort(() => Math.random() - 0.5);

    client.activeRain = {
      total: totalMoney,
      chunks: chunks,
      winners: [],
      maxWinners: maxWinners,
      channelId: message.channel.id
    };

    return message.channel.send({
      embeds: [
        successEmbed(
          "💸 HUJAN UANG DARI SURGA! 💸",
          `Alya baru saja menjatuhkan **${money(totalMoney)}** dari langit!\n\nRebutan yuk! **${maxWinners} orang pertama** yang mengetik \`.ambil\` akan mendapat bagian secara acak!\n\n*Ayo cepetan sebelum kehabisan!*`
        )
      ]
    });
  }
};
