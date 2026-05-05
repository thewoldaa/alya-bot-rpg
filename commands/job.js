const { infoEmbed, successEmbed, errorEmbed } = require("../utils/embeds");

const { findJob, formatJobs } = require("../utils/jobs");
const { hungerMax } = require("../config");

module.exports = {
  name: "job",
  aliases: ["kerja"],
  description: "Melihat atau mengambil job.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const action = (args[0] || "list").toLowerCase();

    if (action === "list" || action === "daftar") {
      const current = profile.job
        ? `Job kamu sekarang: **${profile.job.name}**`
        : "Kamu belum punya job.";

      return message.reply({
        embeds: [
          infoEmbed(
            "Daftar Job",
            `${current}\nHunger: **${Number(profile.hunger ?? hungerMax)}** / ${hungerMax}\n\n${formatJobs()}\n\nGunakan \`.job ambil <nama/jobKey>\` untuk memilih job.`
          )
        ]
      });
    }

    if (action !== "ambil" && action !== "pilih" && action !== "set") {
      const search = args.join(" ").trim();
      if (!search) {
        return message.reply({
          embeds: [infoEmbed("Job", "Gunakan `.job` untuk daftar job atau `.job ambil <nama>` untuk memilih job.")]
        });
      }
    }

    const query = action === "ambil" || action === "pilih" || action === "set"
      ? args.slice(1).join(" ").trim()
      : args.join(" ").trim();

    const job = findJob(query);
    if (!job) {
      return message.reply({
        embeds: [
          errorEmbed(
            "Job Tidak Ditemukan",
            `Coba cek daftar job lewat \`.job\`.\n\n${formatJobs()}`
          )
        ]
      });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.job = {
        key: job.key,
        name: job.name,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        xpMin: job.xpMin,
        xpMax: job.xpMax,
        hungerCost: job.hungerCost,
        desc: job.desc,
        selectedAt: Date.now()
      };
      return core;
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Job Dipilih",
          `Kamu sekarang bekerja sebagai **${job.name}**.\n` +
          `Gaji: ${job.salaryMin} - ${job.salaryMax}\n` +
          `XP: ${job.xpMin} - ${job.xpMax}\n` +
          `Hunger cost: ${job.hungerCost}`
        )
      ]
    });
  }
};
