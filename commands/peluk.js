const { successEmbed, errorEmbed } = require("../utils/embeds");

const ACTIONS = {
  peluk: {
    emoji: "🤗",
    self: "memeluk diri sendiri... *aneh*",
    target: "memberikan pelukan hangat kepada",
    responses: [
      "Aww manisnya~",
      "*peluk balik* hehe",
      "Hangat banget pelukannya!",
      "Malu ih... tapi suka hehe~"
    ]
  },
  cium: {
    emoji: "😘",
    self: "mencium tangannya sendiri... okay",
    target: "memberikan ciuman di pipi kepada",
    responses: [
      "KYAAA! Malu!!",
      "D-dasar baka...",
      "*blush* ih apaan sih",
      "Alya juga mau dicium! eh..."
    ]
  },
  tampar: {
    emoji: "👋",
    self: "menampar dirinya sendiri... kenapa?",
    target: "MENAMPAR keras-keras",
    responses: [
      "ADUH SAKIIIT!",
      "*shock* kenapa sih?!",
      "Itu sakit tau!",
      "BALES! *tampar balik*"
    ]
  },
  toel: {
    emoji: "👉",
    self: "menoel dirinya sendiri",
    target: "menoel pipi",
    responses: [
      "Ih geli!",
      "Apa sih? hehe",
      "*menatap bingung*",
      "Toel balik! *toel toel*"
    ]
  },
  pukul: {
    emoji: "👊",
    self: "memukul dirinya sendiri... masokis?",
    target: "memukul bahu",
    responses: [
      "HEH SAKIT!",
      "Awas ya nanti aku bales!",
      "*menghindar* Hampir kena!",
      "OW! Tanganmu keras amat!"
    ]
  }
};

module.exports = {
  name: "peluk",
  aliases: ["cium", "tampar", "toel", "pukul"],
  description: "Interaksi sosial / roleplay dengan pemain lain.",
  async execute({ message, args, db }) {
    // Deteksi aksi dari command name atau alias
    const content = message.content.toLowerCase().trim();
    const prefix = content.charAt(0);
    const cmdName = content.slice(1).split(/\s+/)[0];

    const actionKey = Object.keys(ACTIONS).find(k => k === cmdName);
    if (!actionKey) return;

    const action = ACTIONS[actionKey];
    const targetUser = message.mentions.users.first();

    if (!targetUser) {
      return message.reply(`${action.emoji} <@${message.author.id}> ${action.self}`);
    }

    if (targetUser.id === message.author.id) {
      return message.reply(`${action.emoji} <@${message.author.id}> ${action.self}`);
    }

    const response = action.responses[Math.floor(Math.random() * action.responses.length)];

    return message.channel.send({
      embeds: [
        successEmbed(
          `${action.emoji} Interaksi!`,
          `<@${message.author.id}> ${action.target} <@${targetUser.id}>!\n\n*"${response}"*`
        )
      ]
    });
  }
};
