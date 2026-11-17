import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';
import { prepareDeletedAttachments } from '../utils/logging/deletedAttachments.js';

const MAX_SAMPLE_MESSAGES = 8;
const MAX_SAMPLE_CONTENT_LENGTH = 240;

function truncate(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export default {
  name: Events.MessageBulkDelete,
  once: false,

  async execute(messages, client) {
    try {
      const deleted = [...(messages?.values?.() ?? messages ?? [])];
      if (deleted.length === 0) return;

      const guild = deleted.find((message) => message.guild)?.guild;
      if (!guild) return;

      const humanMessages = deleted.filter((message) => !message.author?.bot);
      if (humanMessages.length === 0) return;

      const channelIds = [...new Set(humanMessages.map((message) => message.channel?.id).filter(Boolean))];
      const timestamps = humanMessages
        .map((message) => Number(message.createdTimestamp))
        .filter((timestamp) => Number.isFinite(timestamp));

      const lines = [
        formatLogLine('Deleted', `${humanMessages.length} message(s)`),
        formatLogLine('Channels', channelIds.length ? channelIds.map((id) => `<#${id}>`).join(', ') : 'Unknown'),
      ];

      if (timestamps.length > 1) {
        lines.push(formatLogLine('Between', `<t:${Math.floor(Math.min(...timestamps) / 1000)}:R> and <t:${Math.floor(Math.max(...timestamps) / 1000)}:R>`));
      }

      const allAttachments = humanMessages.flatMap((message) => [...(message.attachments?.values?.() ?? [])]);
      if (allAttachments.length > 0) {
        const prepared = await prepareDeletedAttachments({
          id: 'bulk',
          attachments: { values: () => allAttachments },
        });
        lines.push(formatLogLine('Attachments', String(allAttachments.length)));
        lines.push(...prepared.lines);

        await logEvent({
          client: humanMessages[0]?.client || client,
          guildId: guild.id,
          eventType: EVENT_TYPES.MESSAGE_BULK_DELETE,
          attachments: prepared.files,
          data: {
            title: 'Messages bulk deleted',
            lines: [...lines, ...buildSampleLines(humanMessages)],
            quoted: true,
            image: prepared.previewUrl || undefined,
            channelId: channelIds.length === 1 ? channelIds[0] : null,
          }
        });
        return;
      }

      await logEvent({
        client: humanMessages[0]?.client || client,
        guildId: guild.id,
        eventType: EVENT_TYPES.MESSAGE_BULK_DELETE,
        data: {
          title: 'Messages bulk deleted',
          lines: [...lines, ...buildSampleLines(humanMessages)],
          quoted: true,
          channelId: channelIds.length === 1 ? channelIds[0] : null,
        }
      });
    } catch (error) {
      logger.error('Error in messageDeleteBulk event:', error);
    }
  }
};

function buildSampleLines(messages) {
  return messages.slice(0, MAX_SAMPLE_MESSAGES).map((message, index) => {
    const author = message.author?.toString() || 'Unknown user';
    const channel = message.channel?.toString() || 'unknown channel';
    const body = truncate(message.content, MAX_SAMPLE_CONTENT_LENGTH) || '*(attachment only)*';
    return formatLogLine(`Message ${index + 1}`, `${author} in ${channel}: ${body}`);
  });
}
