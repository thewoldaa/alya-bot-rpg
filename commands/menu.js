const { sendPagedMenu, buildMenuPages } = require("../utils/interactiveMenu");

module.exports = {
  name: "menu",
  aliases: ["m"],
  description: "Menu utama bot.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    const pages = buildMenuPages({
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
