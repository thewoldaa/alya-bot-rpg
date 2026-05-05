const { infoEmbed } = require("../utils/embeds");
const {  formatCoreId } = require("../utils/guards");
const { money } = require("../utils/format");

module.exports = {
  name: "money",
  aliases: ["saldo", "uang"],
  description: "Melihat saldo uang.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    return message.reply({
      embeds: [
        infoEmbed(
          "Money",
          `Nama: **${profile.username}**\nSaldo: **${money(profile.uang)}**\nCore ID: \`${formatCoreId(profile.core_id)}\``
        )
      ]
    });
  }
};
