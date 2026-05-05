const { successEmbed, errorEmbed } = require("../utils/embeds");
const fs = require("fs");
const path = require("path");
const https = require("https");

module.exports = {
  name: "addsb",
  description: "Menambah soundboard baru. Upload file mp3/wav dan beri nama.",
  async execute({ message, args, db }) {
    const name = args[0]?.toLowerCase();
    if (!name) return message.reply({ embeds: [errorEmbed("Gagal", "Sebutkan nama sound-nya!\nContoh: `.addsb ketawa` (sambil upload file)")] });

    const attachment = message.attachments.first();
    if (!attachment) return message.reply({ embeds: [errorEmbed("Gagal", "Kamu harus mengupload file MP3 atau WAV!")] });

    const validExtensions = [".mp3", ".wav", ".ogg"];
    const ext = path.extname(attachment.name).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Format file harus MP3, WAV, atau OGG!")] });
    }

    if (db.state.soundboard[name]) {
      return message.reply({ embeds: [errorEmbed("Gagal", "Nama sound ini sudah dipakai. Gunakan nama lain atau hapus dulu.")] });
    }

    const soundsDir = path.join(process.cwd(), "database", "sounds");
    if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });

    const filePath = path.join(soundsDir, `${name}${ext}`);
    const file = fs.createWriteStream(filePath);

    https.get(attachment.url, (response) => {
      response.pipe(file);
      file.on("finish", async () => {
        file.close();
        
        db.state.soundboard[name] = {
          name: name,
          path: filePath,
          addedBy: message.author.id,
          createdAt: Date.now()
        };
        await db.persist();

        message.reply({ embeds: [successEmbed("Soundboard Ditambah", `Sound **${name}** berhasil disimpan! Gunakan \`/sb ${name}\` untuk memutar.`)] });
      });
    }).on("error", (err) => {
      fs.unlink(filePath, () => {});
      console.error(err);
      message.reply({ embeds: [errorEmbed("Error", "Gagal mendownload file.")] });
    });
  }
};
