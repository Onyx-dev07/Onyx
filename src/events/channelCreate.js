import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';
import { buildChannelBaseLines, channelReference } from '../utils/logging/channelAudit.js';

export default {
  name: Events.ChannelCreate,
  once: false,

  async execute(channel, client) {
    try {
      if (!channel.guild) return;

      const lines = [
        ...buildChannelBaseLines(channel),
        formatLogLine('Position', String(channel.position ?? 0)),
      ];

      if (typeof channel.nsfw === 'boolean') {
        lines.push(formatLogLine('NSFW', channel.nsfw ? 'Yes' : 'No'));
      }
      if (typeof channel.topic === 'string') {
        lines.push(formatLogLine('Topic', channel.topic || '*(none)*'));
      }

      await logEvent({
        client: channel.client || client,
        guildId: channel.guild.id,
        eventType: EVENT_TYPES.CHANNEL_CREATE,
        data: {
          title: 'Channel created',
          headline: `${channelReference(channel)} was created`,
          lines,
        }
      });
    } catch (error) {
      logger.error('Error in channelCreate event:', error);
    }
  }
};
