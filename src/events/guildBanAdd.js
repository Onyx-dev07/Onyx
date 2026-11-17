import { AuditLogEvent, Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';

export default {
  name: Events.GuildBanAdd,
  once: false,

  async execute(ban, client) {
    try {
      const { guild, user } = ban;
      if (!guild) return;

      const audit = await findAuditEntry(guild, AuditLogEvent.MemberBanAdd, user.id);
      const lines = [
        formatLogLine('User', `${user.toString()} (\`${user.id}\`)`),
        formatLogLine('Reason', audit?.reason || 'No reason provided'),
      ];
      if (audit?.executor) {
        lines.push(formatLogLine('Moderator', `${audit.executor.toString()} (\`${audit.executor.id}\`)`));
      }

      await logEvent({
        client: guild.client || client,
        guildId: guild.id,
        eventType: EVENT_TYPES.MODERATION_BAN,
        data: {
          title: 'Member banned',
          lines,
          thumbnail: user.displayAvatarURL({ dynamic: true }),
          userId: user.id,
          footer: audit?.executor
            ? { text: `${audit.executor.tag} • Onyx`, iconURL: audit.executor.displayAvatarURL({ dynamic: true }) }
            : undefined,
        }
      });
    } catch (error) {
      logger.error('Error in guildBanAdd event:', error);
    }
  }
};

async function findAuditEntry(guild, type, userId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 10 });
    return logs?.entries?.find((entry) =>
      entry.target?.id === userId && Date.now() - entry.createdTimestamp < 120_000
    ) || null;
  } catch {
    return null;
  }
}
