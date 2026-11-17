import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { getReactionRoleMessage, deleteReactionRoleMessage } from '../services/reactionRoleService.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';
import { prepareDeletedAttachments } from '../utils/logging/deletedAttachments.js';
import { consumeBrainrotDeletion } from '../services/brainrotWebhookService.js';

const MAX_LOGGED_MESSAGE_CONTENT_LENGTH = 1024;
const MAX_SNIPE_CONTENT_LENGTH = 1800;
const MAX_SNIPE_CHANNELS = 500;

// Keep the most recent human message per channel so !snipe can show it without
// a database round-trip. Bots are skipped, matching the logging behavior.
function rememberSnipe(message) {
  if (!message.channel?.id) return;

  const client = message.client;
  if (!client.snipes) client.snipes = new Map();

  const attachments = [...(message.attachments?.values?.() ?? [])]
    .map(attachment => attachment.url)
    .slice(0, 4);

  client.snipes.set(message.channel.id, {
    content: String(message.content || '').slice(0, MAX_SNIPE_CONTENT_LENGTH),
    authorId: message.author?.id ?? null,
    authorTag: message.author?.tag ?? 'Unknown user',
    createdAt: message.createdTimestamp ?? Date.now(),
    deletedAt: Date.now(),
    attachments,
  });

  if (client.snipes.size > MAX_SNIPE_CHANNELS) {
    const oldestChannel = client.snipes.keys().next().value;
    if (oldestChannel) client.snipes.delete(oldestChannel);
  }
}

export default {
  name: Events.MessageDelete,
  once: false,

  async execute(message) {
    try {
      if (!message.guild) return;

      // The brainrot hook deletes the original after reposting it as the
      // member. That cleanup is not a real deletion, so keep it out of the
      // moderation log and the snipe cache.
      if (consumeBrainrotDeletion(message.id)) return;

      try {
        const reactionRoleData = await getReactionRoleMessage(message.client, message.guild.id, message.id);
        if (reactionRoleData) {
          await deleteReactionRoleMessage(message.client, message.guild.id, message.id);
          logger.info(`Cleaned up reaction role database entry for manually deleted message ${message.id} in guild ${message.guild.id}`);

          try {
            await logEvent({
              client: message.client,
              guildId: message.guild.id,
              eventType: EVENT_TYPES.REACTION_ROLE_DELETE,
              data: {
                title: 'Reaction Role Removed',
                lines: [
                  formatLogLine('Channel', message.channel ? `${message.channel.name} ${message.channel.toString()}` : 'Unknown'),
                  formatLogLine('Message ID', `\`${message.id}\``),
                  formatLogLine('Cleanup', 'Database entry removed automatically'),
                ],
                quoted: true,
              }
            });
          } catch (logCleanupError) {
            logger.warn('Failed to log reaction role cleanup after manual message deletion:', logCleanupError);
          }
        }
      } catch (reactionRoleCleanupError) {
        logger.warn(`Failed to clean up reaction role data for deleted message ${message.id}:`, reactionRoleCleanupError);
      }

      if (message.author?.bot) return;

      rememberSnipe(message);

      const metaLines = [
        formatLogLine('Channel', message.channel ? `${message.channel.name} ${message.channel.toString()}` : 'Unknown'),
        formatLogLine('Message ID', `\`${message.id}\``),
        formatLogLine('Message author', message.author ? message.author.toString() : 'Unknown'),
        formatLogLine('Message created', `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`),
      ];

      let messageBody = null;
      if (message.content) {
        messageBody = message.content.length > MAX_LOGGED_MESSAGE_CONTENT_LENGTH
          ? `${message.content.substring(0, MAX_LOGGED_MESSAGE_CONTENT_LENGTH - 3)}...`
          : message.content;
      }

      let attachmentFiles = [];
      let attachmentPreview = null;
      if (message.attachments.size > 0) {
        const prepared = await prepareDeletedAttachments(message);
        attachmentFiles = prepared.files;
        attachmentPreview = prepared.previewUrl;
        metaLines.push(formatLogLine('Attachments', String(message.attachments.size)));
        metaLines.push(...prepared.lines);
      }

      await logEvent({
        client: message.client,
        guildId: message.guild.id,
        eventType: EVENT_TYPES.MESSAGE_DELETE,
        attachments: attachmentFiles,
        data: {
          title: 'Message deleted',
          lines: metaLines,
          quoted: true,
          image: attachmentPreview || undefined,
          section: messageBody ? { title: 'Message', body: messageBody || '*(empty message)*' } : null,
          userId: message.author?.id,
          channelId: message.channel.id,
        }
      });

    } catch (error) {
      logger.error('Error in messageDelete event:', error);
    }
  }
};
