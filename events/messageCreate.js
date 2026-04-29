const { ChannelType } = require("discord.js");
const { prefix } = require("../config");
const { successEmbed, infoEmbed } = require("../utils/embeds");
const { isOwner, requireRegistered } = require("../utils/guards");
const { randInt } = require("../utils/random");
const { timeAgo } = require("../utils/format");
const { consumeActReply } = require("../utils/actSystem");
const { getAlyaResponse } = require("../utils/alya");

const spamBuckets = new Map();
const publicCommands = new Set(["register"]);

function parsePrefixCommand(content) {
  if (!content.startsWith(prefix)) return null;
  const sliced = content.slice(prefix.length).trim();
  if (!sliced) return null;
  const [name, ...args] = sliced.split(/\s+/);
  return { name: name.toLowerCase(), args };
}

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message || !message.author || message.author.bot) return;

    const profile = client.db.getCoreByDiscordId(message.author.id);

    if (profile) {
      const actHandled = await consumeActReply({
        message,
        profile,
        db: client.db
      });
      if (actHandled?.handled) {
        return;
      }
    }

    if (message.mentions.users.size) {
      for (const user of message.mentions.users.values()) {
        const mentionedProfile = client.db.getCoreByDiscordId(user.id);
        if (mentionedProfile?.afk?.active) {
          message.reply({
            embeds: [
              infoEmbed(
                `${user.username} Sedang AFK`,
                `${mentionedProfile.afk.reason || "Tanpa alasan"}\nSejak: ${timeAgo(mentionedProfile.afk.since)}`
              )
            ]
          }).catch(() => {});
          break;
        }
      }
    }

    if (profile) {
      const blockUntil = Number(profile.spam?.blocked_until || 0);
      if (blockUntil > Date.now()) {
        return;
      }

      const now = Date.now();
      const bucket = spamBuckets.get(message.author.id) || [];
      bucket.push(now);
      const filtered = bucket.filter((stamp) => now - stamp <= client.config.spamWindowMs);
      spamBuckets.set(message.author.id, filtered);

      if (filtered.length >= client.config.spamThreshold) {
        await client.db.updateCore(profile.core_id, (core) => {
          core.spam = { blocked_until: Date.now() + client.config.spamBlockMs };
          return core;
        });
        spamBuckets.delete(message.author.id);
        return message.reply({
          embeds: [
            infoEmbed(
              "Anti Spam Aktif",
              "Kamu diblokir sementara selama 5 menit karena terlalu cepat mengirim pesan."
            )
          ]
        }).catch(() => {});
      }
    }

    const parsed = parsePrefixCommand(message.content);
    if (parsed) {
      const command = client.commands.get(parsed.name);
      if (!command) return;

      const targetProfile = client.db.getCoreByDiscordId(message.author.id);
      if (!targetProfile && !publicCommands.has(parsed.name)) {
        return requireRegistered(message, targetProfile);
      }

      try {
        await command.execute({
          client,
          message,
          args: parsed.args,
          commandName: parsed.name,
          db: client.db,
          config: client.config
        });
      } catch (error) {
        console.error(`Error executing ${parsed.name}:`, error);
        await message.reply({
          embeds: [
            infoEmbed(
              "Terjadi Kesalahan",
              "Command gagal diproses. Coba lagi sebentar, atau cek log server."
            )
          ]
        }).catch(() => {});
      }
      return;
    }

    const isAlyaMentioned = message.mentions.users.has(client.user.id) || message.content.toLowerCase().includes("alya");
    if (isAlyaMentioned || message.channel.type === ChannelType.DM) {
      const response = getAlyaResponse(message.author.id, message.content);
      return message.reply(response).catch(() => {});
    }

    const coreProfile = profile;
    if (!coreProfile) return;

    if (coreProfile?.afk?.active) {
      const duration = timeAgo(coreProfile.afk.since);
      await client.db.setAfk(coreProfile.core_id, { active: false, reason: "", since: 0 });
      message.reply({
        embeds: [
          successEmbed(
            "AFK Dimatikan",
            `Selamat datang kembali, <@${message.author.id}>.\nKamu AFK selama **${duration}**.`
          )
        ]
      }).catch(() => {});
    }

    const xpGain = randInt(5, 15);
    const beforeLevel = Number(coreProfile.level || 1);
    const updated = await client.db.addXp(coreProfile.core_id, xpGain);
    if (updated && updated.level > beforeLevel) {
      message.channel.send({
        embeds: [
          successEmbed(
            "Level Up",
            `<@${message.author.id}> naik ke level **${updated.level}**.`
          )
        ]
      }).catch(() => {});
    }
  }
};
