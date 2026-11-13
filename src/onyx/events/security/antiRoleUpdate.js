const { PermissionFlagsBits } = require('discord.js');
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
  name: 'roleUpdate',
  async execute(oldRole, newRole, client) {
    if (!newRole.guild) return;
    const guild = newRole.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    // Only react when Administrator is newly granted.
    const oldHasAdmin = oldRole.permissions.has(PermissionFlagsBits.Administrator);
    const newHasAdmin = newRole.permissions.has(PermissionFlagsBits.Administrator);
    if (oldHasAdmin || !newHasAdmin) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.RoleUpdate, { targetId: newRole.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'rlup')) return;

      logger.warn(`[AntiNuke] Unauthorized Administrator permission added to role @${newRole.name} by ${executor.tag}!`);

      // 1. Revert permissions
      await newRole.setPermissions(
        oldRole.permissions,
        '[Onyx AntiNuke] Reverting dangerous permissions'
      ).catch(err => logger.error('[AntiNuke] Failed to revert role permissions:', err.message));

      // 2. Contain the executor
      const banned = await neutralize(
        guild,
        executor,
        `Granted Administrator permission to role @${newRole.name}`
      );

      await sendSecurityAlert(
        guild,
        'AntiNuke: Dangerous Permission Escalation Neutralized',
        alertBody(
          executor,
          [`**Target Role:** @${newRole.name} (\`${newRole.id}\`)`],
          banned
            ? 'Administrator permission stripped & offender banned.'
            : 'Permission stripped, but offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiRoleUpdate event:', err);
    }
  }
};
