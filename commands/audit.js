const { infoEmbed, errorEmbed } = require("../utils/embeds");
const { isOwner } = require("../utils/guards");
const { timeAgo } = require("../utils/format");

module.exports = {
  name: "audit",
  aliases: ["auditlog"],
  description: "(OWNER/ADMIN) Menarik laporan keamanan ringkas 24 jam terakhir.",
  async execute({ message, db }) {
    if (!isOwner(message.author.id)) {
      return message.reply({ embeds: [errorEmbed("Akses Ditolak", "Command ini hanya untuk Owner/Admin.")] });
    }

    if (!message.guild) {
      return message.reply("Command ini hanya bisa digunakan di server.");
    }

    const guildSettings = db.getGuildSettings(message.guild.id);
    const logs = guildSettings.audit_logs || [];

    const recentLogs = logs.filter(log => (Date.now() - log.timestamp) <= 24 * 60 * 60 * 1000);

    if (recentLogs.length === 0) {
      return message.reply({
        embeds: [infoEmbed("Audit Kosong", "Tidak ada penggunaan command sensitif dalam 24 jam terakhir.")]
      });
    }

    const logLines = recentLogs.slice(0, 15).map(log => {
      const time = timeAgo(log.timestamp);
      return `**${log.user}** \`[${log.command}]\` - ${log.action} (${time})`;
    });

    return message.reply({
      embeds: [
        infoEmbed(
          "🛡️ Laporan Audit Keamanan (24 Jam)",
          logLines.join("\n") + (recentLogs.length > 15 ? `\n\n*...dan ${recentLogs.length - 15} log lainnya.*` : "")
        )
      ]
    });
  }
};
