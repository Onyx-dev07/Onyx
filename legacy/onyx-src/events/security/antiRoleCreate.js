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
  name: 'roleCreate',
  async execute(role, client) {
    if (!role.guild) return;
    const guild = role.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.RoleCreate, { targetId: role.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'rlcr')) return;

      logger.warn(`[AntiNuke] Unauthorized role creation in ${guild.name} by ${executor.tag}! Mitigating...`);

      await role.delete('[Onyx AntiNuke] Unauthorized Role Creation').catch(() => {});
      const banned = await neutralize(guild, executor, `Unauthorized Role Creation: @${role.name}`);

      await sendSecurityAlert(
        guild,
        'AntiNuke: Role Creation Neutralized',
        alertBody(
          executor,
          [`**Created Role:** @${role.name} (\`${role.id}\`)`],
          `Role removed${banned ? ' & offender banned' : ' (ban failed — check role hierarchy)'}.`
        )
      );
    } catch (err) {
      logger.error('Error in antiRoleCreate event:', err);
    }
  }
};
