const { ActivityType, EmbedBuilder } = require("discord.js");
const { updateStockState } = require("../utils/market");
const { money } = require("../utils/format");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    client.runtime.readyAt = Date.now();
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
      activities: [{ name: "RPG & Economy System", type: ActivityType.Playing }],
      status: "online"
    });

    const slashCommands = client.slashCommands.map((command) => command.data.toJSON());
    const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;

    try {
      if (guildId) {
        const guild = await client.guilds.fetch(guildId);
        await guild.commands.set(slashCommands);
        console.log(`Slash commands registered to guild ${guild.name}`);
      } else {
        await client.application.commands.set(slashCommands);
        console.log("Global slash commands registered");

        const guilds = [...client.guilds.cache.values()];
        for (const guild of guilds) {
          await guild.commands.set(slashCommands).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Gagal register slash commands:", error);
    }

    let stockTickRunning = false;

    const runStockTick = async () => {
      if (stockTickRunning) return;
      stockTickRunning = true;
      try {
        const stocks = client.db.getStocks();
        const payload = {};
        for (const stock of stocks) {
          payload[stock.symbol] = stock;
        }

        const { stocks: updated, notifications } = updateStockState(payload);
        await client.db.updateStocks(async () => updated);

        if (!notifications.length) return;

        const top = notifications.slice(0, 3)
          .map((item) => `- ${item.symbol}: ${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}% -> ${money(item.price)}`)
          .join("\n");

        for (const settings of Object.values(client.db.state.guildSettings)) {
          if (!settings.chat_channel_id) continue;

          const lastAlertAt = Number(settings.last_market_alert_at || 0);
          if (Date.now() - lastAlertAt < client.config.marketAlertCooldownMs) {
            continue;
          }

          const channel = await client.channels.fetch(settings.chat_channel_id).catch(() => null);
          if (!channel || !channel.isTextBased()) continue;

          const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle("Market Alert")
            .setDescription(top);

          await channel.send({ embeds: [embed] }).catch(() => {});
          await client.db.setGuildSettings(settings.guild_id, {
            last_market_alert_at: Date.now()
          }).catch(() => {});
        }
      } catch (error) {
        console.error("Stock timer error:", error);
      } finally {
        stockTickRunning = false;
      }
    };

    await runStockTick();

    if (!client.runtime.stockTimer) {
      const scheduleNextTick = () => {
        const intervalMs = Math.max(1_000, Number(client.config.stockIntervalMs || 60_000));
        const useMinuteAlignment = intervalMs >= 60_000;
        const delay = useMinuteAlignment
          ? Math.max(1_000, 60_000 - (Date.now() % 60_000))
          : intervalMs;

        client.runtime.stockTimer = setTimeout(async () => {
          await runStockTick();
          scheduleNextTick();
        }, delay);
      };

      scheduleNextTick();
    }
  }
};
