import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';

const MAX_LISTED_PERMISSIONS = 8;

function formatList(values, max = MAX_LISTED_PERMISSIONS) {
  if (!values.length) return 'none';
  const shown = values.slice(0, max).join(', ');
  return values.length > max ? `${shown} (+${values.length - max} more)` : shown;
}

export default {
  name: Events.GuildRoleUpdate,
  once: false,

  async execute(oldRole, newRole, client) {
    try {
      if (!newRole.guild) return;

      const lines = [
        formatLogLine('Role', `${newRole.toString()} (\`${newRole.id}\`)`),
      ];

      if (oldRole.name !== newRole.name) {
        lines.push(formatLogLine('Name', `\`${oldRole.name}\` → \`${newRole.name}\``));
      }

      if (oldRole.color !== newRole.color) {
        lines.push(formatLogLine('Color', `${oldRole.hexColor} → ${newRole.hexColor}`));
      }

      if (oldRole.hoist !== newRole.hoist) {
        lines.push(formatLogLine('Hoisted', `${oldRole.hoist ? 'Yes' : 'No'} → ${newRole.hoist ? 'Yes' : 'No'}`));
      }

      if (oldRole.mentionable !== newRole.mentionable) {
        lines.push(formatLogLine('Mentionable', `${oldRole.mentionable ? 'Yes' : 'No'} → ${newRole.mentionable ? 'Yes' : 'No'}`));
      }

      if (oldRole.position !== newRole.position) {
        lines.push(formatLogLine('Position', `${oldRole.position} → ${newRole.position}`));
      }

      const oldPermissions = oldRole.permissions.toArray();
      const newPermissions = newRole.permissions.toArray();
      const added = newPermissions.filter((permission) => !oldPermissions.includes(permission));
      const removed = oldPermissions.filter((permission) => !newPermissions.includes(permission));

      if (added.length) lines.push(formatLogLine('Permissions added', formatList(added)));
      if (removed.length) lines.push(formatLogLine('Permissions removed', formatList(removed)));

      if (lines.length === 1) return;

      await logEvent({
        client: newRole.client || client,
        guildId: newRole.guild.id,
        eventType: EVENT_TYPES.ROLE_UPDATE,
        data: {
          title: 'Role updated',
          headline: `**${newRole.name}** was updated`,
          lines,
        }
      });
    } catch (error) {
      logger.error('Error in roleUpdate event:', error);
    }
  }
};
