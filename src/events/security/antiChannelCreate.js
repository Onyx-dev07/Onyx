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
  name: 'channelCreate',
  async execute(channel, client) {
    if (!channel.guild) return;
    const guild = channel.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.ChannelCreate, { targetId: channel.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'chcr')) return;

      logger.warn(`[AntiNuke] Unauthorized channel creation in ${guild.name} by ${executor.tag}! Mitigating...`);

      await channel.delete('[Onyx AntiNuke] Unauthorized Channel Creation').catch(() => {});
      const banned = await neutralize(guild, executor, `Unauthorized Channel Creation: #${channel.name}`);

      await sendSecurityAlert(
        guild,
        'AntiNuke: Channel Creation Neutralized',
        alertBody(
          executor,
          [`**Created Channel:** #${channel.name} (\`${channel.id}\`)`],
          `Channel removed${banned ? ' & offender banned' : ' (ban failed — check role hierarchy)'}.`
        )
      );
    } catch (err) {
      logger.error('Error in antiChannelCreate event:', err);
    }
  }
};
