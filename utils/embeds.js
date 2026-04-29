const { EmbedBuilder } = require("discord.js");

function makeEmbed(title, description, color = 0x2b2d31) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title);

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

function successEmbed(title, description) {
  return makeEmbed(title, description, 0x57f287);
}

function errorEmbed(title, description) {
  return makeEmbed(title, description, 0xed4245);
}

function infoEmbed(title, description) {
  return makeEmbed(title, description, 0x5865f2);
}

module.exports = {
  makeEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed
};
