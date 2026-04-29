const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { isOwner } = require("../../utils/guards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Membersihkan pesan di channel tertentu tanpa menghapus data bot.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Jumlah pesan yang akan dihapus")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel tujuan, kosongkan untuk channel saat ini")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(null),
  async executeSlash(interaction, db) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        embeds: [errorEmbed("Hanya Server", "Command ini hanya bisa dipakai di server.")],
        flags: 64
      });
    }

    const profile = db.getCoreByDiscordId(interaction.user.id);
    if (!isOwner(interaction.user.id, profile)) {
      return interaction.reply({
        embeds: [errorEmbed("Akses Ditolak", "Command ini khusus owner.")],
        flags: 64
      });
    }

    const guildSettings = db.getGuildSettings(interaction.guildId);
    if (!guildSettings.chat_channel_id) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Chat Channel Belum Diset",
            "Gunakan `/setchat` dulu untuk menentukan channel bot. `/clear` hanya bekerja pada channel yang sudah diset."
          )
        ],
        flags: 64
      });
    }

    const amount = interaction.options.getInteger("amount") || 50;
    const requestedChannel = interaction.options.getChannel("channel") || interaction.channel;

    if (String(requestedChannel.id) !== String(guildSettings.chat_channel_id)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Channel Tidak Sesuai",
            `\`/clear\` hanya boleh dipakai di channel yang diset sebagai chat bot, yaitu <#${guildSettings.chat_channel_id}>.`
          )
        ],
        flags: 64
      });
    }

    const channel = interaction.guild.channels.cache.get(guildSettings.chat_channel_id) || requestedChannel;

    if (!channel || !("bulkDelete" in channel)) {
      return interaction.reply({
        embeds: [errorEmbed("Channel Tidak Valid", "Channel ini tidak bisa dibersihkan.")],
        flags: 64
      });
    }

    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return interaction.reply({
        embeds: [errorEmbed("Channel Tidak Didukung", "Gunakan channel teks atau announcement.")],
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const deleted = await channel.bulkDelete(amount, true);
      return interaction.editReply({
        embeds: [
          successEmbed(
            "Channel Dibersihkan",
            `Berhasil menghapus **${deleted.size}** pesan di ${channel}. Data bot tetap aman dan tidak berubah.`
          )
        ]
      });
    } catch (error) {
      console.error("Failed to clear channel:", error);
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "Gagal Membersihkan",
            "Tidak bisa membersihkan channel ini. Pastikan bot punya izin dan pesan yang dipilih masih dalam batas bulk delete Discord."
          )
        ]
      });
    }
  }
};
