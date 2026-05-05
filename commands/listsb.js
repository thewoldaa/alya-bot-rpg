const { infoEmbed } = require("../utils/embeds");

module.exports = {
  name: "listsb",
  aliases: ["soundlist"],
  description: "Melihat daftar semua soundboard yang tersedia.",
  async execute({ message, db }) {
    const sounds = Object.keys(db.state.soundboard);

    if (sounds.length === 0) {
      return message.reply({ embeds: [infoEmbed("Soundboard Kosong", "Belum ada sound yang ditambahkan. Gunakan `.addsb <nama>` untuk menambah.")] });
    }

    const list = sounds.map((s, i) => `${i + 1}. **${s}**`).join("\n");

    return message.reply({
      embeds: [
        infoEmbed(
          "🔊 Daftar Soundboard",
          `Gunakan \`/sb <nama>\` untuk memutar!\n\n${list}`
        )
      ]
    });
  }
};
