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
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;
    const guild = newChannel.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.ChannelUpdate, { targetId: newChannel.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'chup')) return;

      logger.warn(`[AntiNuke] Unauthorized channel update in ${guild.name} by ${executor.tag}! Mitigating...`);

      const banned = await neutralize(guild, executor, `Unauthorized Channel Update: #${newChannel.name}`);

      const changes = [];
      if (oldChannel.name !== newChannel.name) changes.push(`**Name:** \`${oldChannel.name}\` → \`${newChannel.name}\``);
      if (oldChannel.topic !== newChannel.topic) changes.push('**Topic changed**');
      if (oldChannel.parentId !== newChannel.parentId) changes.push('**Category changed**');
      if (
        oldChannel.permissionOverwrites?.cache.size !== newChannel.permissionOverwrites?.cache.size ||
        !oldChannel.permissionOverwrites?.cache.every(overwrite => {
          const current = newChannel.permissionOverwrites?.cache.get(overwrite.id);
          return current && current.allow.bitfield === overwrite.allow.bitfield && current.deny.bitfield === overwrite.deny.bitfield;
        })
      ) {
        changes.push('**Permission overwrites changed**');
      }

      await sendSecurityAlert(
        guild,
        'AntiNuke: Channel Update Neutralized',
        alertBody(
          executor,
          [`**Channel:** #${newChannel.name} (\`${newChannel.id}\`)`, ...changes],
          banned ? 'Offender banned.' : 'Offender could not be banned — check role hierarchy.'
        )
      );
    } catch (err) {
      logger.error('Error in antiChannelUpdate event:', err);
    }
  }
};
