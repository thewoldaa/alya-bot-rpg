const { successEmbed, errorEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { randInt, pickOne } = require("../utils/random");
const { money } = require("../utils/format");

const symbols = ["🍒", "🍋", "🍇", "7️⃣", "💎"];

module.exports = {
  name: "slot",
  aliases: [],
  description: "Judi slot sederhana.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const bet = Number(args[0]);
    if (!Number.isFinite(bet) || bet <= 0) {
      return message.reply({
        embeds: [errorEmbed("Format Salah", "Gunakan `.slot <bet>`")]
      });
    }

    if ((profile.uang || 0) < bet) {
      return message.reply({
        embeds: [errorEmbed("Uang Tidak Cukup", `Saldo kamu hanya ${money(profile.uang)}.`)]
      });
    }

    const spin = [pickOne(symbols), pickOne(symbols), pickOne(symbols)];
    let payout = 0;
    if (spin[0] === spin[1] && spin[1] === spin[2]) {
      payout = bet * 5;
    } else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) {
      payout = bet * 2;
    }

    await db.updateCore(profile.core_id, (core) => {
      core.uang = Math.max(0, Number(core.uang || 0) - bet + payout);
      return core;
    });

    const resultText = payout > bet
      ? `Kamu menang ${money(payout - bet)}.`
      : payout === bet
        ? "Kamu balik modal."
        : `Kamu kalah ${money(bet - payout)}.`;

    return message.reply({
      embeds: [
        successEmbed(
          "Slot",
          `${spin.join(" | ")}\n${resultText}`
        )
      ]
    });
  }
};
