const { successEmbed } = require("../utils/embeds");
const { requireRegistered } = require("../utils/guards");
const { randInt } = require("../utils/random");
const { money } = require("../utils/format");
const { workCooldownMs, hungerMax } = require("../config");
const { getGearBonuses } = require("../utils/gear");

module.exports = {
  name: "work",
  aliases: [],
  description: "Mencari uang sesuai job yang dipilih.",
  async execute({ message, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!requireRegistered(message, profile)) return;

    if (!profile.job) {
      return message.reply({
        embeds: [
          successEmbed(
            "Belum Punya Job",
            "Pilih pekerjaan dulu lewat `.job` sebelum kerja."
          )
        ]
      });
    }

    const lastWork = Number(profile.last_work_at || 0);
    const now = Date.now();
    const cooldownLeft = workCooldownMs - (now - lastWork);
    if (cooldownLeft > 0) {
      const seconds = Math.ceil(cooldownLeft / 1000);
      return message.reply({
        embeds: [
          successEmbed(
            "Cooldown Work",
            `Kamu masih cooldown ${seconds} detik lagi.`
          )
        ]
      });
    }

    const job = profile.job;
    const gearBonuses = getGearBonuses(profile);
    const hungerCost = Number(job.hungerCost || 0);
    const hunger = Number(profile.hunger ?? hungerMax);
    const reducedHungerCost = Math.max(1, hungerCost - gearBonuses.hungerReduction);
    if (hunger < reducedHungerCost) {
      return message.reply({
        embeds: [
          successEmbed(
            "Lapar",
            `Kamu butuh makan dulu lewat \`.mk\` sebelum kerja.`
          )
        ]
      });
    }

    const level = Number(profile.level || 1);
    const rewardBoost = 1 + Math.min(2, (level - 1) * 0.05) + gearBonuses.moneyBonus;
    const xpBoost = 1 + Math.min(1.5, (level - 1) * 0.03) + gearBonuses.xpBonus;
    const baseReward = randInt(job.salaryMin, job.salaryMax);
    const reward = Math.max(0, Math.floor(baseReward * rewardBoost));
    const xp = Math.max(1, Math.floor(randInt(job.xpMin, job.xpMax) * xpBoost));
    const bonusRoll = Math.random() < gearBonuses.luckBonus;
    const luckyBonus = bonusRoll ? Math.floor(reward * 0.2) : 0;

    const result = await db.updateCore(profile.core_id, (core) => {
      core.uang = Math.max(0, Number(core.uang || 0) + reward + luckyBonus);
      core.xp = Number(core.xp || 0) + xp;
      while (core.xp >= db.getXpNeed(core.level)) {
        core.xp -= db.getXpNeed(core.level);
        core.level += 1;
      }
      core.hunger = Math.max(0, Number(core.hunger ?? hungerMax) - reducedHungerCost);
      core.last_work_at = now;
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Kerja Selesai",
          `Job: **${job.name}**\nKamu mendapatkan ${money(reward + luckyBonus)} dan ${xp} XP.\nSisa lapar: **${result.hunger}** / ${hungerMax}${luckyBonus ? `\nBonus lucky: ${money(luckyBonus)}` : ""}`
        )
      ]
    });
  }
};
