const { AuditLogEvent } = require('discord.js');
const db = require('../../database');
const logger = require('../../utils/logger');
const {
  MAX_AUDIT_AGE_MS,
  isTrusted,
  neutralize,
  sendSecurityAlert,
  alertBody
} = require('../../utils/security');

async function findWebhookEntry(guild, channelId) {
  const types = [AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookUpdate, AuditLogEvent.WebhookDelete];
  const candidates = [];

  for (const type of types) {
    const logs = await guild.fetchAuditLogs({ limit: 5, type }).catch(() => null);
    if (!logs) continue;

    for (const entry of logs.entries.values()) {
      if (!entry.executor) continue;
      const age = Date.now() - entry.createdTimestamp;
      if (age > MAX_AUDIT_AGE_MS) continue;

      const targetChannel = entry.target?.channelId || entry.extra?.channel?.id;
      if (targetChannel && targetChannel !== channelId) continue;

      candidates.push({ entry, age, type });
    }
  }

  candidates.sort((a, b) => a.age - b.age);
  return candidates[0] || null;
}

module.exports = {
  name: 'webhooksUpdate',
  async execute(channel, client) {
    if (!channel.guild) return;
    const guild = channel.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const result = await findWebhookEntry(guild, channel.id);
      if (!result) return;

      const { entry, type } = result;
      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'webhook')) return;

      const labels = {
        [AuditLogEvent.WebhookCreate]: 'Webhook Creation',
        [AuditLogEvent.WebhookUpdate]: 'Webhook Update',
        [AuditLogEvent.WebhookDelete]: 'Webhook Deletion'
      };
      const actionName = labels[type] || 'Webhook Modification';

      logger.warn(`[AntiNuke] Unauthorized ${actionName.toLowerCase()} in ${guild.name} by ${executor.tag}! Mitigating...`);

      const banned = await neutralize(guild, executor, `Unauthorized ${actionName}`);

      // Remove a webhook that was created/edited by the rogue user
      if (type !== AuditLogEvent.WebhookDelete && typeof entry.target?.delete === 'function') {
        await entry.target.delete(`[Onyx AntiNuke] Unauthorized ${actionName}`).catch(() => {});
      }

      await sendSecurityAlert(
        guild,
        `AntiNuke: ${actionName} Neutralized`,
        alertBody(
          executor,
          [`**Channel:** #${channel.name} (\`${channel.id}\`)`],
          `${actionName} blocked${banned ? ' & offender banned' : ' (ban failed — check role hierarchy)'}.`
        )
      );
    } catch (err) {
      logger.error('Error in antiWebhook event:', err);
    }
  }
};
