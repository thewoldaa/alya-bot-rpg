const { successEmbed, errorEmbed, infoEmbed } = require("../utils/embeds");


const availableThemes = ["default", "dark", "light", "cinema", "cyberpunk", "pink"];

module.exports = {
  name: "settheme",
  aliases: ["theme"],
  description: "Mengatur tema warna profil dan embed kartu.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const theme = args[0]?.toLowerCase();

    if (!theme || !availableThemes.includes(theme)) {
      return message.reply({
        embeds: [
          infoEmbed(
            "Tema Tersedia",
            `Pilih salah satu tema berikut: \n**${availableThemes.join(", ")}**\n\nCara pakai: \`.settheme <nama_tema>\``
          )
        ]
      });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.theme = theme;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Tema Diperbarui",
          `Tema profil kamu sekarang diset ke: **${theme}**.`
        )
      ]
    });
  }
};
