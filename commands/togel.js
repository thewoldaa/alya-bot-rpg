const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { randInt } = require("../utils/random");
const { money } = require("../utils/format");

module.exports = {
  name: "togel",
  aliases: [],
  description: "Tebak angka acak.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const guess = Number(args[0]);
    const bet = Number(args[1]);

    if (!Number.isInteger(guess) || guess < 0 || guess > 9 || !Number.isFinite(bet) || bet <= 0) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.togel <angka 0-9> <bet>`")]
      });
    }

    if ((profile.uang || 0) < bet) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Saldo kamu hanya ${money(profile.uang)}.`)]
      });
    }

    const result = randInt(0, 9);
    let payout = 0;
    if (guess === result) {
      payout = bet * 9;
    }

    await db.updateCore(profile.core_id, (core) => {
      core.uang = Math.max(0, Number(core.uang || 0) - bet + payout);
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Togel",
          `Angka keluar: **${result}**\n${guess === result ? `Menang ${money(payout - bet)}.` : `Kalah ${money(bet)}.`}`
        )
      ]
    });
  }
};
