const { successEmbed, errorEmbed } = require("../utils/embeds");
const { money } = require("../utils/format");

const RESPONSES = [
  "Waaah kamu baik banget! Alya terharu hehe~",
  "Makasih ya! Anak-anak panti senang banget dapet uangnya!",
  "Kamu orang baik... Alya jadi malu ehe~",
  "Semoga rejekinya dilipat gandakan ya! *terharu*",
  "Hiks... Alya ga pernah ketemu orang sebaik kamu...",
  "BANYAK AMAT?! Eh maksudnya... makasih ya hehe mwehehe~"
];

const TITLES = {
  1000: "Dermawan Pemula",
  10000: "Pemberi Harapan",
  50000: "Malaikat Koin",
  100000: "Santo Panti Asuhan",
  500000: "Legenda Kemurahan Hati"
};

module.exports = {
  name: "sedekah",
  aliases: ["donate", "amal"],
  description: "Menyumbangkan uang untuk kebaikan. Uang hilang, tapi hati senang.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Sebutkan jumlah yang ingin disedekahkan!\nContoh: `.sedekah 5000`")] });
    }

    if ((profile.uang || 0) < amount) {
      return message.reply({ embeds: [errorEmbed("Miskin", "Kamu bahkan nggak punya uang segitu buat disedekahkan!")] });
    }

    const newTotal = (profile.total_sedekah || 0) + amount;

    await db.updateCore(profile.core_id, (core) => {
      core.uang -= amount;
      core.total_sedekah = newTotal;
      return core;
    });

    // Cek apakah dapat gelar baru
    let title = "";
    const thresholds = Object.keys(TITLES).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
      if (newTotal >= threshold) {
        title = TITLES[threshold];
        break;
      }
    }

    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    return message.reply({
      embeds: [
        successEmbed(
          "💝 Sedekah Diterima",
          `Kamu menyumbangkan **${money(amount)}** ke Panti Asuhan Alya.\n\n*"${response}"* — Alya\n\nTotal sedekahmu: **${money(newTotal)}**${title ? `\nGelar: **${title}** 🏅` : ""}`
        )
      ]
    });
  }
};
