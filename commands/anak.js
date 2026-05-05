const { successEmbed, infoEmbed, errorEmbed } = require("../utils/embeds");

const { hasHouse } = require("../utils/helpers");

function formatChildren(children) {
  if (!children.length) return "Belum punya anak.";
  return children.map((child, index) => {
    const born = child.bornAt ? `<t:${Math.floor(child.bornAt / 1000)}:R>` : "-";
    return `${index + 1}. ${child.name} | ${born}`;
  }).join("\n");
}

async function createChild({ message, db, profile, childName }) {
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

  const name = childName || `Anak-${(profile.anak?.length || 0) + 1}`;
  await db.updateCore(profile.core_id, (core) => {
    core.anak = Array.isArray(core.anak) ? core.anak : [];
    core.anak.push({
      name,
      bornAt: Date.now(),
      from: core.pasangan[0] || null
    });
    core.hubungan = Math.min(500, Number(core.hubungan || 0) + 10);
    return core;
  });

  return message.reply({
    embeds: [
      successEmbed("Anak Lahir", `Selamat, ${name} telah lahir ke keluarga kamu.`)
    ]
  });
}

module.exports = {
  name: "anak",
  aliases: [],
  description: "Melihat anak atau menambah anak.",
  async execute({ message, args, db }) {
    const profile = db.getCoreByDiscordId(message.author.id);
    if (!profile) return;

    const action = (args[0] || "list").toLowerCase();
    if (action === "list" || action === "lihat") {
      return message.reply({
        embeds: [infoEmbed("Anak", formatChildren(profile.anak || []))]
      });
    }

    if (action === "add" || action === "buat") {
      const childName = args.slice(1).join(" ").trim();
      return createChild({ message, db, profile, childName });
    }

    return message.reply({
      embeds: [infoEmbed("Anak", "Gunakan `.anak` untuk melihat anak atau `.anak add <nama>` untuk menambah anak.")]
    });
  }
};
