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
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;
    const guild = channel.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.ChannelDelete, { targetId: channel.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'chdl')) return;

      logger.warn(`[AntiNuke] Unauthorized channel deletion in ${guild.name} by ${executor.tag}! Mitigating...`);

      // 1. Contain the rogue executor
      const banned = await neutralize(guild, executor, `Unauthorized Channel Deletion: #${channel.name}`);

      // 2. Auto-Recover the deleted channel
      const recoveredChannel = await guild.channels.create({
        name: channel.name,
        type: channel.type,
        topic: channel.topic,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rateLimitPerUser,
        parent: channel.parentId,
        position: channel.rawPosition,
        permissionOverwrites: channel.permissionOverwrites.cache,
        reason: '[Onyx AntiNuke] Auto-Recovery of Deleted Channel'
      }).catch(err => {
        logger.error('[AntiNuke] Failed to auto-recover channel:', err.message);
        return null;
      });

      await sendSecurityAlert(
        guild,
        'AntiNuke: Channel Deletion Neutralized',
        alertBody(
          executor,
          [
            `**Deleted Channel:** #${channel.name} (\`${channel.id}\`)`,
            `**Channel Recovered:** ${recoveredChannel ? `<#${recoveredChannel.id}>` : 'Failed'}`
          ],
          banned
            ? 'Offender banned & channel auto-recovered.'
            : 'Offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiChannelDelete event:', err);
    }
  }
};
