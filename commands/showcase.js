const { EmbedBuilder } = require("discord.js");
const { errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");

module.exports = {
  name: "showcase",
  aliases: ["pamer"],
  description: "Menampilkan karakter favorit dalam bingkai khusus.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const claims = db.getCharacterClaimsByCore(profile.core_id);
    if (claims.length === 0) {
      return message.reply({
        embeds: [errorEmbed("Belum Ada Karakter", "Kamu belum punya karakter untuk dipamerkan. Coba gacha dulu!")]
      });
    }

    const slot = Number(args[0] || 1);
    if (!Number.isInteger(slot) || slot < 1 || slot > claims.length) {
      return message.reply({
        embeds: [errorEmbed("Slot Tidak Valid", `Pilih slot karakter yang valid (1 - ${claims.length}).`)]
      });
    }

    const claim = claims[slot - 1];
    const characterName = claim.character ? claim.character.name : "Unknown Character";
    const animeName = claim.character ? claim.character.anime : "Unknown Anime";
    const image = claim.pp || (claim.character ? claim.character.image : null);

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setAuthor({ name: `${message.author.username}'s Showcase`, iconURL: message.author.displayAvatarURL() })
      .setTitle(`🌟 ${characterName} 🌟`)
      .setDescription(`Dari seri: **${animeName}**\n\n*"Inilah karakter andalanku!"*`)
      .setFooter({ text: `Karakter dari Slot ${slot}` });

    if (image) {
      embed.setImage(image);
    } else {
      embed.setDescription(embed.data.description + "\n\n*(Belum ada gambar untuk karakter ini)*");
    }

    return message.reply({ embeds: [embed] });
  }
};
