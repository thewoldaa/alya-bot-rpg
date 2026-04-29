const { sendPagedMenu, buildHelpPages } = require("../utils/interactiveMenu");

module.exports = {
  name: "help",
  aliases: [],
  description: "Bantuan command bot.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    const pages = buildHelpPages({
      profile,
      user: message.author,
      message,
      db
    });

    return sendPagedMenu(
      message,
      pages,
      {
        profile,
        user: message.author,
        message,
        db
      },
      { timeoutMs: 60_000, startPage: 0 }
    );
  }
};
