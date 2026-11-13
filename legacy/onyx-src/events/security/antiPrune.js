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
  name: 'guildMemberRemove',
  async execute(member, client) {
    const guild = member.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.MemberPrune);
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'prune')) return;

      logger.warn(`[AntiNuke] Unauthorized member prune in ${guild.name} by ${executor.tag}! Mitigating...`);

      const banned = await neutralize(guild, executor, 'Unauthorized Member Prune');

      const prunedCount = entry.extra?.removed ?? 'unknown';

      await sendSecurityAlert(
        guild,
        'AntiNuke: Member Prune Neutralized',
        alertBody(
          executor,
          [`**Pruned Members:** ${prunedCount}`],
          banned ? 'Offender banned.' : 'Offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiPrune event:', err);
    }
  }
};
