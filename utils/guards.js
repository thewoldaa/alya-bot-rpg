const { ownerIds, defaultUserLimit } = require("../config");
const { errorEmbed } = require("./embeds");

const OWNER_USERNAME = "craftkal";

function isOwner(user, context = null) {
  if (!user) return false;
  let userId;
  let username = "";

  if (typeof user === "object") {
    userId = user.id;
    username = user.username || "";
  } else {
    userId = String(user);
  }

  if (username === OWNER_USERNAME) return true;
  if (ownerIds.includes(String(userId))) return true;

  if (!context) return false;

  const profile = typeof context.getCoreByDiscordId === "function"
    ? context.getCoreByDiscordId(userId)
    : context;

  return Boolean(profile?.core_id && (String(profile.core_id).startsWith("owner_") || String(profile.core_id) === String(userId)));
}

function isAdmin(member) {
  if (!member) return false;
  return member.permissions.has("Administrator");
}

function isMod(member) {
  if (!member) return false;
  if (isAdmin(member)) return true;
  return member.roles.cache.some((role) => role.name.toLowerCase() === "moderator");
}

function requireAuthority(message, level = "Mod") {
  const user = message.author;
  const member = message.member;

  const owner = isOwner(user);
  const admin = isAdmin(member);
  const mod = isMod(member);

  if (level === "Owner" && !owner) {
    message.reply({
      embeds: [errorEmbed("Akses Ditolak", "Hanya **Owner** yang bisa menggunakan command ini.")]
    }).catch(() => {});
    return false;
  }

  if (level === "Admin" && !owner && !admin) {
    message.reply({
      embeds: [errorEmbed("Akses Ditolak", "Hanya **Owner** atau **Admin** yang bisa menggunakan command ini.")]
    }).catch(() => {});
    return false;
  }

  if (level === "Mod" && !owner && !admin && !mod) {
    message.reply({
      embeds: [errorEmbed("Akses Ditolak", "Hanya **Owner**, **Admin**, atau **Moderator** yang bisa menggunakan command ini.")]
    }).catch(() => {});
    return false;
  }

  return true;
}

function requireRegistered(message, profile) {
  if (profile) return true;
  message.reply({
    embeds: [
      errorEmbed(
        "Akun Belum Terdaftar",
        "Gunakan `.register <nama>` terlebih dahulu sebelum memakai fitur bot."
      )
    ]
  }).catch(() => {});
  return false;
}

function getDisplayName(member, user) {
  return member?.displayName || user?.globalName || user?.username || "Unknown";
}

function getDefaultLimitForGuild(db, guildId) {
  if (!guildId) return defaultUserLimit;
  const settings = db.getGuildSettings(guildId);
  return Number(settings.user_limit || defaultUserLimit);
}

function isHiddenCoreId(coreId) {
  return String(coreId || "").startsWith("owner_");
}

function formatCoreId(coreId) {
  return isHiddenCoreId(coreId) ? "[disembunyikan]" : String(coreId || "-");
}

module.exports = {
  isOwner,
  isAdmin,
  isMod,
  requireAuthority,
  requireRegistered,
  getDisplayName,
  getDefaultLimitForGuild,
  isHiddenCoreId,
  formatCoreId
};
