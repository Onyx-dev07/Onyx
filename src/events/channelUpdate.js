import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';
import { channelReference } from '../utils/logging/channelAudit.js';

function categoryLabel(channel) {
  return channel?.parent ? `${channel.parent.name} (\`${channel.parent.id}\`)` : 'None';
}

export default {
  name: Events.ChannelUpdate,
  once: false,

  async execute(oldChannel, newChannel, client) {
    try {
      if (!newChannel.guild) return;

      const lines = [formatLogLine('Channel', channelReference(newChannel))];

      if (oldChannel.name !== newChannel.name) {
        lines.push(formatLogLine('Name', `\`${oldChannel.name}\` → \`${newChannel.name}\``));
      }

      if (oldChannel.parentId !== newChannel.parentId) {
        lines.push(formatLogLine('Category', `${categoryLabel(oldChannel)} → ${categoryLabel(newChannel)}`));
      }

      if (oldChannel.position !== newChannel.position) {
        lines.push(formatLogLine('Position', `${oldChannel.position} → ${newChannel.position}`));
      }

      if (oldChannel.topic !== newChannel.topic) {
        lines.push(formatLogLine('Topic', `\`${oldChannel.topic || '*(none)*'}\` → \`${newChannel.topic || '*(none)*'}\``));
      }

      if (oldChannel.nsfw !== newChannel.nsfw) {
        lines.push(formatLogLine('NSFW', `${oldChannel.nsfw ? 'Yes' : 'No'} → ${newChannel.nsfw ? 'Yes' : 'No'}`));
      }

      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        lines.push(formatLogLine('Slowmode', `${oldChannel.rateLimitPerUser ?? 0}s → ${newChannel.rateLimitPerUser ?? 0}s`));
      }

      if (oldChannel.bitrate !== newChannel.bitrate && newChannel.bitrate != null) {
        lines.push(formatLogLine('Bitrate', `${Math.round((oldChannel.bitrate ?? 0) / 1000)} kbps → ${Math.round(newChannel.bitrate / 1000)} kbps`));
      }

      if (oldChannel.userLimit !== newChannel.userLimit && newChannel.userLimit != null) {
        lines.push(formatLogLine('User limit', `${oldChannel.userLimit ?? 0} → ${newChannel.userLimit}`));
      }

      if (lines.length === 1) return;

      await logEvent({
        client: newChannel.client || client,
        guildId: newChannel.guild.id,
        eventType: EVENT_TYPES.CHANNEL_UPDATE,
        data: {
          title: 'Channel updated',
          headline: `${channelReference(newChannel)} was updated`,
          lines,
        }
      });
    } catch (error) {
      logger.error('Error in channelUpdate event:', error);
    }
  }
};
