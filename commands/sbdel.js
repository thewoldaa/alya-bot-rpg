const { successEmbed, errorEmbed } = require("../utils/embeds");
const { isOwner } = require("../utils/guards");
const fs = require("fs");

module.exports = {
  name: "sbdel",
  description: "Menghapus soundboard (Admin Only).",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!isOwner(message.author.id, profile)) {
      return message.reply({ embeds: [errorEmbed("Akses Ditolak", "Hanya Admin yang bisa menghapus soundboard!")] });
    }

    const name = args[0]?.toLowerCase();
    if (!name) return message.reply({ embeds: [errorEmbed("Gagal", "Sebutkan nama sound yang mau dihapus!")] });

    const sound = db.state.soundboard[name];
    if (!sound) return message.reply({ embeds: [errorEmbed("Gagal", "Sound tidak ditemukan.")] });

    try {
      if (fs.existsSync(sound.path)) {
        fs.unlinkSync(sound.path);
      }
      
      delete db.state.soundboard[name];
      await db.persist();

      return message.reply({ embeds: [successEmbed("Terhapus", `Sound **${name}** berhasil dihapus dari sistem.`)] });
    } catch (error) {
      console.error(error);
      return message.reply({ embeds: [errorEmbed("Error", "Gagal menghapus file.")] });
    }
  }
};
