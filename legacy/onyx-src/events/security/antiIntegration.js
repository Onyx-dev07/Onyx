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
  name: 'guildIntegrationsUpdate',
  async execute(guild, client) {
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.IntegrationCreate);
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'intg')) return;

      logger.warn(`[AntiNuke] Unauthorized integration added in ${guild.name} by ${executor.tag}! Mitigating...`);

      const banned = await neutralize(guild, executor, 'Unauthorized Integration Create');

      await sendSecurityAlert(
        guild,
        'AntiNuke: Integration Creation Neutralized',
        alertBody(
          executor,
          ['**Action:** Added a guild integration'],
          banned ? 'Offender banned. Review the server integrations and remove anything suspicious.' : 'Offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiIntegration event:', err);
    }
  }
};
