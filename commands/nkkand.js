const { successEmbed, errorEmbed } = require("../utils/embeds");

const { hasHouse } = require("../utils/helpers");

module.exports = {
  name: "nkkand",
  aliases: [],
  description: "Alias aksi anak.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const childName = args.join(" ").trim() || `Anak-${(profile.anak?.length || 0) + 1}`;
    if (!Array.isArray(profile.pasangan) || profile.pasangan.length === 0) {
      return message.reply({
        embeds: [errorEmbed("Belum Menikah", "Kamu harus punya pasangan dulu.")]
      });
    }

    if (!hasHouse(profile)) {
      return message.reply({
        embeds: [errorEmbed("Rumah Diperlukan", "Kamu harus punya rumah dulu.")]
      });
    }

    await db.updateCore(profile.core_id, (core) => {
      core.anak = Array.isArray(core.anak) ? core.anak : [];
      core.anak.push({
        name: childName,
        bornAt: Date.now(),
        from: core.pasangan[0] || null
      });
      return core;
    });

    return message.reply({
      embeds: [successEmbed("Anak Ditambahkan", `Keluarga baru bertambah: **${childName}**.`)]
    });
  }
};
