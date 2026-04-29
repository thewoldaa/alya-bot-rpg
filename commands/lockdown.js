const { PermissionsBitField, ChannelType } = require("discord.js");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { isOwner } = require("../utils/guards");

module.exports = {
  name: "lockdown",
  aliases: ["lock"],
  description: "(OWNER/ADMIN) Sistem keamanan darurat untuk mengunci semua saluran.",
  async execute({ message, client, db }) {
    if (!isOwner(message.author.id)) {
      return message.reply({ embeds: [errorEmbed("Akses Ditolak", "Command ini hanya untuk Owner/Admin.")] });
    }

    if (!message.guild) {
      return message.reply("Command ini hanya bisa digunakan di server.");
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({ embeds: [errorEmbed("Izin Kurang", "Bot tidak memiliki izin Manage Channels.")] });
    }

    const guildSettings = db.getGuildSettings(message.guild.id);
    const isLocked = guildSettings.lockdown_active;
    const newStatus = !isLocked;

    const channels = await message.guild.channels.fetch();
    let updatedCount = 0;

    for (const [_, channel] of channels) {
      if (channel && channel.type === ChannelType.GuildText) {
        try {
          await channel.permissionOverwrites.edit(message.guild.id, {
            SendMessages: !newStatus
          });
          updatedCount++;
        } catch (err) {
          console.error(`Gagal mengunci channel ${channel.name}:`, err);
        }
      }
    }

    await db.setGuildSettings(message.guild.id, { lockdown_active: newStatus });
    await db.addAuditLog(message.guild.id, {
      command: "lockdown",
      action: newStatus ? "Activated" : "Deactivated",
      user: message.author.tag,
      userId: message.author.id
    });

    return message.reply({
      embeds: [
        successEmbed(
          newStatus ? "🚨 LOCKDOWN AKTIF 🚨" : "✅ LOCKDOWN DICABUT ✅",
          newStatus 
            ? `Berhasil mengunci ${updatedCount} text channel.\nHanya Admin yang bisa mengirim pesan saat ini.` 
            : `Berhasil membuka kunci ${updatedCount} text channel.\nAnggota biasa sudah bisa mengirim pesan kembali.`
        ).setColor(newStatus ? "#FF0000" : "#00FF00")
      ]
    });
  }
};
