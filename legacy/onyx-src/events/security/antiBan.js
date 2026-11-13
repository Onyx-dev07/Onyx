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
  name: 'guildBanAdd',
  async execute(ban, client) {
    const guild = ban.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.MemberBanAdd, { targetId: ban.user.id });
      if (!entry) {
        logger.info(`[AntiNuke] Ban of ${ban.user.tag} in ${guild.name} had no audit entry — skipping.`);
        return;
      }

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'ban')) return;

      logger.warn(`[AntiNuke] Unauthorized ban in ${guild.name} by ${executor.tag}! Mitigating...`);

      // 1. Contain the rogue executor
      const banned = await neutralize(guild, executor, `Unauthorized Member Ban: ${ban.user.tag}`);

      // 2. Revert the ban on the victim
      const reverted = await guild.bans.remove(
        ban.user.id,
        '[Onyx AntiNuke] Auto-Reverting ban by untrusted executor'
      ).then(() => true).catch(err => {
        logger.error('[AntiNuke] Failed to unban victim:', err.message);
        return false;
      });

      // 3. Dispatch alert
      await sendSecurityAlert(
        guild,
        'AntiNuke: Unauthorized Ban Neutralized',
        alertBody(
          executor,
          [
            `**Target User:** ${ban.user.tag} (\`${ban.user.id}\`)`,
            `**Audit Action:** Member Ban`,
            `**Victim Ban Reverted:** ${reverted ? 'Yes' : 'No'}`
          ],
          banned
            ? 'Offender banned & victim ban reverted automatically.'
            : 'Offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiBan event:', err);
    }
  }
};
