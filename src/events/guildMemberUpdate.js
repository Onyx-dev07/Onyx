import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';

function timeoutTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timeoutLabel(timestamp) {
  return timestamp ? `<t:${Math.floor(timestamp / 1000)}:R>` : 'None';
}

function roleMention(guild, roleId) {
  return guild.roles?.cache?.get(roleId)?.toString() || `<@&${roleId}>`;
}

export default {
  name: Events.GuildMemberUpdate,
  once: false,

  async execute(oldMember, newMember, client) {
    try {
      if (!newMember.guild) return;

      if (oldMember.nickname !== newMember.nickname) {
        await logEvent({
          client: newMember.client || client,
          guildId: newMember.guild.id,
          eventType: EVENT_TYPES.MEMBER_NAME_CHANGE,
          data: {
            title: 'Nickname changed',
            lines: [
              `**User:** <@${newMember.user.id}>`,
              `**ID:** \`${newMember.user.id}\``,
              `**Before:** ${oldMember.nickname || '*(no nickname)*'}`,
              `**After:** ${newMember.nickname || '*(no nickname)*'}`,
            ],
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true }),
            userId: newMember.user.id,
          }
        });
      }

      const oldRoleIds = new Set(oldMember.roles.cache.keys());
      const newRoleIds = new Set(newMember.roles.cache.keys());
      const addedRoles = [...newRoleIds].filter((roleId) => !oldRoleIds.has(roleId));
      const removedRoles = [...oldRoleIds].filter((roleId) => !newRoleIds.has(roleId));

      if (addedRoles.length || removedRoles.length) {
        const lines = [
          formatLogLine('User', `${newMember.toString()} (\`${newMember.id}\`)`),
        ];
        if (addedRoles.length) {
          lines.push(`➕ ${formatLogLine('Roles added', addedRoles.map((roleId) => roleMention(newMember.guild, roleId)).join(', '))}`);
        }
        if (removedRoles.length) {
          lines.push(`➖ ${formatLogLine('Roles removed', removedRoles.map((roleId) => roleMention(newMember.guild, roleId)).join(', '))}`);
        }

        await logEvent({
          client: newMember.client || client,
          guildId: newMember.guild.id,
          eventType: EVENT_TYPES.MEMBER_ROLE_UPDATE,
          data: {
            title: 'Member roles updated',
            lines,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true }),
            userId: newMember.user.id,
          }
        });
      }

      const oldTimeout = timeoutTimestamp(oldMember.communicationDisabledUntil);
      const newTimeout = timeoutTimestamp(newMember.communicationDisabledUntil);

      if (oldTimeout !== newTimeout) {
        const action = !oldTimeout ? 'timed out' : !newTimeout ? 'untimed out' : 'timeout updated';
        await logEvent({
          client: newMember.client || client,
          guildId: newMember.guild.id,
          eventType: EVENT_TYPES.MEMBER_TIMEOUT,
          data: {
            title: `Member ${action}`,
            lines: [
              formatLogLine('User', `${newMember.toString()} (\`${newMember.id}\`)`),
              formatLogLine('Before', timeoutLabel(oldTimeout)),
              formatLogLine('After', timeoutLabel(newTimeout)),
            ],
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true }),
            userId: newMember.user.id,
          }
        });
      }
    } catch (error) {
      logger.error('Error in guildMemberUpdate event:', error);
    }
  }
};
