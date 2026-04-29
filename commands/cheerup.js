const { successEmbed, errorEmbed } = require("../utils/embeds");

const quotes = [
  "Jangan menyerah, badai pasti berlalu!",
  "Kamu lebih kuat dari yang kamu bayangkan.",
  "Setiap hari adalah kesempatan baru untuk memulai kembali.",
  "Kesalahan adalah bukti bahwa kamu sedang mencoba.",
  "Tarik napas dalam-dalam, kamu pasti bisa melewati ini.",
  "Tidak apa-apa untuk istirahat sejenak, kamu pantas mendapatkannya.",
  "Bintang tidak bisa bersinar tanpa kegelapan.",
  "Teruslah berjalan, meskipun perlahan.",
  "Kamu sangat berarti, jangan pernah lupa itu.",
  "Satu senyuman darimu bisa mengubah hari seseorang, termasuk harimu sendiri."
];

module.exports = {
  name: "cheerup",
  aliases: ["semangat"],
  description: "Mengirim kata-kata semangat untuk teman yang sedang down.",
  async execute({ message, args }) {
    if (message.mentions.users.size === 0) {
      return message.reply({
        embeds: [errorEmbed("Target Tidak Ditemukan", "Kamu harus mention seseorang! Contoh: `.cheerup @teman`")]
      });
    }

    const target = message.mentions.users.first();
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    return message.channel.send({
      content: `<@${target.id}>`,
      embeds: [
        successEmbed(
          "💖 Pesan Semangat Untukmu",
          `*"${randomQuote}"*\n\n— Dikirim oleh **${message.author.username}**`
        )
      ]
    });
  }
};
