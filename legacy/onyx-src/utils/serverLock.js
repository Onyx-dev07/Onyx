const { ChannelType } = require('discord.js');
const logger = require('./logger');

/**
 * Applies or clears a server-wide send lock on public text channels.
 * `allow` false locks, true restores normal send permissions.
 */
async function setServerLock(guild, allow) {
  let count = 0;
  const channels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText);

  for (const channel of channels.values()) {
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: allow ? null : false
      });
      count++;
    } catch (err) {
      logger.warn(`[Lockdown] Failed to update #${channel.name}:`, err.message);
    }
  }

  return { count };
}

function lockServer(guild) {
  return setServerLock(guild, false);
}

function unlockServer(guild) {
  return setServerLock(guild, true);
}

module.exports = { lockServer, unlockServer };
