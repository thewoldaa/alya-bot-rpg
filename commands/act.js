const { errorEmbed } = require("../utils/embeds");
const { requireRegistered, isOwner } = require("../utils/guards");
const {
  normalizeChoice,
  processActChoice,
  startActPrompt,
  clearActSession
} = require("../utils/actSystem");

const DIRECT_CHOICES = new Set(["1", "2", "3", "makan", "tidur", "selingkuh"]);

function pickTargetClaim(db, profile, slotArg) {
  const claims = db.getCharacterClaimsByCore(profile.core_id);
  if (!claims.length) return { claims, targetClaim: null, slotIndex: 0 };

  const rawSlot = Number(slotArg);
  const slotIndex = Number.isFinite(rawSlot) && rawSlot >= 1 && rawSlot <= claims.length
    ? rawSlot - 1
    : 0;

  return {
    claims,
    targetClaim: claims[slotIndex] || null,
    slotIndex
  };
}

module.exports = {
  name: "act",
  aliases: [],
  description: "Aksi interaktif dengan pasangan/character.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    const { claims, targetClaim, slotIndex } = pickTargetClaim(db, profile, args[1]);
    if (!claims.length || !targetClaim) {
      return message.reply({
        embeds: [
          errorEmbed(
            "Tidak Ada Pasangan",
            "Kamu belum punya pasangan/character yang bisa diajak act. Klaim dulu lewat `.character` atau `.lamar`."
          )
        ]
      });
    }

    const choice = normalizeChoice(args[0]);
    if (DIRECT_CHOICES.has(choice)) {
      clearActSession(profile.core_id);
      const result = await processActChoice({
        choice,
        profile,
        db,
        targetClaim,
        slotIndex,
        showSlot: isOwner(message.author.id, profile)
      });

      return message.reply({
        embeds: [result.embed]
      });
    }

    clearActSession(profile.core_id);
    const prompt = await startActPrompt({
      channel: message.channel,
      profile,
      userId: message.author.id,
      db,
      targetClaim,
      slotIndex,
      showSlot: isOwner(message.author.id, profile)
    });

    if (!prompt.ok) {
      return message.reply({
        embeds: [prompt.embed || errorEmbed("Act Gagal", "Prompt act tidak bisa dibuat.")]
      });
    }

    return prompt.prompt;
  }
};
