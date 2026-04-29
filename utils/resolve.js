async function resolveMember(guild, raw) {
  if (!guild || !raw) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const mentionId = text.match(/^<@!?(\d+)>$/)?.[1];
  const id = mentionId || (text.match(/^\d+$/)?.[0]);

  if (id) {
    try {
      return await guild.members.fetch(id);
    } catch {
      return guild.members.cache.get(id) || null;
    }
  }

  const lower = text.toLowerCase();
  const cached = guild.members.cache.find((member) =>
    member.displayName.toLowerCase().includes(lower) ||
    member.user.username.toLowerCase().includes(lower)
  );
  if (cached) return cached;

  try {
    const fetched = await guild.members.fetch({ query: text, limit: 10 });
    return fetched.first() || null;
  } catch {
    return null;
  }
}

module.exports = {
  resolveMember
};
