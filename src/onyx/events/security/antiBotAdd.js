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
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (!member.user.bot) return;
    const guild = member.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.BotAdd, { targetId: member.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'botadd')) return;

      logger.warn(`[AntiNuke] Unauthorized bot added to ${guild.name} by ${executor.tag}! Mitigating...`);

      // 1. Remove the rogue bot
      const botRemoved = await member.ban({
        reason: '[Onyx AntiNuke] Unauthorized Bot Added'
      }).then(() => true).catch(() =>
        member.kick('[Onyx AntiNuke] Unauthorized Bot Added').then(() => true).catch(() => false)
      );

      // 2. Contain the inviter
      const banned = await neutralize(
        guild,
        executor,
        `Added unauthorized bot ${member.user.tag}`
      );

      await sendSecurityAlert(
        guild,
        'AntiNuke: Unauthorized Bot Invite Neutralized',
        alertBody(
          executor,
          [
            `**Rogue Bot:** <@${member.id}>`,
            `**Bot Removed:** ${botRemoved ? 'Yes' : 'No'}`
          ],
          banned
            ? 'Rogue bot removed and inviter banned.'
            : 'Bot removed, but inviter could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiBotAdd event:', err);
    }
  }
};
