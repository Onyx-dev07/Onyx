const { ChannelType } = require('discord.js');

const JAIL_LOG_CHANNEL_NAMES = ['jail-logs', 'onyx-jail-logs'];

const JAIL_EVENT_TYPES = {
  JAIL: 'jail.jail',
  UNJAIL: 'jail.unjail',
  RESET: 'jail.reset',
};

let loggingServicePromise;

function loadLoggingService() {
  if (!loggingServicePromise) {
    // The community bot code is ESM; Onyx commands are CommonJS.
    loggingServicePromise = import('../../services/loggingService.js');
  }
  return loggingServicePromise;
}

function findJailLogChannel(guild) {
  for (const name of JAIL_LOG_CHANNEL_NAMES) {
    const channel = [...guild.channels.cache.values()].find((entry) =>
      entry.type === ChannelType.GuildText && entry.name.toLowerCase() === name
    );
    if (channel) return channel;
  }
  return null;
}

async function syncJailLogDestination(guild, channelId) {
  if (!channelId) return false;
  try {
    const logging = await loadLoggingService();
    return await logging.setLogChannel(guild.client, guild.id, 'jail', channelId);
  } catch (error) {
    require('../utils/logger').error('Failed to sync jail log destination:', error);
    return false;
  }
}

async function sendJailLog(guild, eventType, data, jailConfig = {}) {
  try {
    const logging = await loadLoggingService();
    let configuredChannelId = null;

    try {
      const status = await logging.getLoggingStatus(guild.client, guild.id);
      configuredChannelId = status.channels?.jail || null;
    } catch {
      configuredChannelId = null;
    }

    const channelId = configuredChannelId
      || jailConfig.logChannelId
      || findJailLogChannel(guild)?.id
      || null;

    if (!channelId) return null;

    if (!configuredChannelId) {
      await syncJailLogDestination(guild, channelId);
    }

    return await logging.logEvent({
      client: guild.client,
      guildId: guild.id,
      eventType,
      channelId,
      data,
    });
  } catch (error) {
    require('../utils/logger').error('Failed to send jail log:', error);
    return null;
  }
}

module.exports = {
  JAIL_EVENT_TYPES,
  JAIL_LOG_CHANNEL_NAMES,
  findJailLogChannel,
  syncJailLogDestination,
  sendJailLog,
};
