const db = require('../../database');
const logger = require('../../utils/logger');
const {
  AuditLogEvent,
  isTrusted,
  fetchAuditEntry,
  neutralize,
  sendSecurityAlert,
  alertBody
} = require('../../utils/security');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    if (!role.guild) return;
    const guild = role.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.RoleDelete, { targetId: role.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'rldl')) return;

      logger.warn(`[AntiNuke] Unauthorized role deletion in ${guild.name} by ${executor.tag}! Mitigating...`);

      // 1. Contain the rogue executor
      const banned = await neutralize(guild, executor, `Unauthorized Role Deletion: @${role.name}`);

      // 2. Auto-Recover the role
      const recoveredRole = await guild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        permissions: role.permissions,
        mentionable: role.mentionable,
        reason: '[Onyx AntiNuke] Auto-Recovery of Deleted Role'
      }).catch(err => {
        logger.error('[AntiNuke] Failed to auto-recover role:', err.message);
        return null;
      });

      await sendSecurityAlert(
        guild,
        'AntiNuke: Role Deletion Neutralized',
        alertBody(
          executor,
          [
            `**Deleted Role:** @${role.name}`,
            `**Role Recovered:** ${recoveredRole ? `<@&${recoveredRole.id}>` : 'Failed'}`
          ],
          banned
            ? 'Offender banned & role auto-recovered.'
            : 'Offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiRoleDelete event:', err);
    }
  }
};
