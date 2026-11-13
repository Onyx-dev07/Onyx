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

    // Only act on kicks — guildMemberRemove also fires for bans and leaves.
    // Confirm the audit entry is actually a MemberKick before mitigating.
    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.MemberKick, { targetId: member.id });
      if (!entry) {
        logger.info(`[AntiNuke] Member ${member.user.tag} left/removed in ${guild.name} with no kick audit entry — skipping.`);
        return;
      }

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'kick')) return;

      logger.warn(`[AntiNuke] Unauthorized kick in ${guild.name} by ${executor.tag}! Mitigating...`);

      // Contain the rogue kicker
      const banned = await neutralize(guild, executor, `Unauthorized Member Kick: ${member.user.username}`);

      await sendSecurityAlert(
        guild,
        'AntiNuke: Unauthorized Kick Neutralized',
        alertBody(
          executor,
          [
            `**Kicked User:** <@${member.id}>`,
            `**Audit Action:** Member Kick`
          ],
          banned
            ? 'Rogue administrator has been banned.'
            : 'Offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiKick event:', err);
    }
  }
};
