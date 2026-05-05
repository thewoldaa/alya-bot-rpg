const { infoEmbed, successEmbed } = require("../utils/embeds");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["menu", "bantuan", "cmds"],
  description: "Menampilkan daftar semua perintah yang tersedia.",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Menampilkan daftar semua perintah yang tersedia."),
  async execute({ message }) {
    const embed = this.getHelpEmbed();
    return message.reply({ embeds: [embed] });
  },
  async executeSlash(interaction) {
    const embed = this.getHelpEmbed();
    return interaction.reply({ embeds: [embed] });
  },
  getHelpEmbed() {
    const categories = {
      "💰 Ekonomi": [
        "`.work` — Bekerja sesuai job",
        "`.daily` — Klaim hadiah harian",
        "`.bank <jumlah>` — Setor uang ke bank",
        "`.tarik <jumlah>` — Tarik uang dari bank",
        "`.money` — Cek saldo",
        "`.pay @user <jumlah>` — Transfer uang"
      ],
      "⛏️ Pekerjaan & Mini-game": [
        "`.mancing` — Memancing ikan",
        "`.tambang` — Menambang mineral",
        "`.berburu` — Berburu monster",
        "`.nebang` — Menebang pohon",
        "`.slot <jumlah>` — Mesin slot"
      ],
      "⚔️ PvP & Kriminal": [
        "`.begal @user` — Merampok pemain (resiko besar)",
        "`.curi @user` — Mencopet pemain (resiko kecil)",
        "`.duel @user <taruhan>` — Duel taruhan 1v1"
      ],
      "🛡️ Guild & Raid": [
        "`.guild help` — Sistem guild/clan",
        "`.boss info` — Lihat status World Boss",
        "`.boss serang` — Serang World Boss"
      ],
      "🎙️ Soundboard": [
        "`.afkalya` — Alya masuk ke voice kamu (stay)",
        "`.kickalya` — Mengeluarkan Alya dari voice",
        "`.addsb <nama>` — Tambah soundboard (upload mp3)",
        "`.listsb` — Lihat daftar soundboard",
        "`/sb <nama>` — Putar soundboard",
        "`.sbdel <nama>` — Hapus soundboard (Admin)"
      ],
      "🤗 Interaksi Sosial": [
        "`.peluk @user` — Memeluk",
        "`.cium @user` — Mencium",
        "`.tampar @user` — Menampar",
        "`.toel @user` — Menoel pipi",
        "`.pukul @user` — Memukul bahu",
        "`.sedekah <jumlah>` — Bersedekah"
      ],
      "📊 Info & Leaderboard": [
        "`.profil` — Lihat profil RPG",
        "`.topglobal uang` — Ranking terkaya",
        "`.topglobal level` — Ranking level",
        "`.topglobal sedekah` — Ranking dermawan",
        "`.inv` — Lihat inventory"
      ],
      "👑 Admin Only": [
        "`.hujanuang <total> <kuota>` — Giveaway massal",
        "`.pajakpaksa` — Rampok 10% uang semua pemain",
        "`.boss spawn` — Panggil World Boss"
      ],
      "🤖 Alya AI": [
        "Sebut **\"alya\"** di chat atau mention bot untuk mengobrol dengan AI Alya!"
      ]
    };

    let helpText = "";
    for (const [category, commands] of Object.entries(categories)) {
      helpText += `**${category}**\n${commands.join("\n")}\n\n`;
    }

    return infoEmbed("📖 Daftar Perintah Alya RPG", helpText);
  }
};
