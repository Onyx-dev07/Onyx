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
  name: 'guildUpdate',
  async execute(oldGuild, newGuild, client) {
    const guild = newGuild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.GuildUpdate);
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'guildup')) return;

      logger.warn(`[AntiNuke] Unauthorized server update in ${guild.name} by ${executor.tag}! Mitigating...`);

      const changes = [];
      if (oldGuild.name !== newGuild.name) {
        changes.push(`**Name:** \`${oldGuild.name}\` → \`${newGuild.name}\``);
        await newGuild.setName(oldGuild.name, '[Onyx AntiNuke] Reverting unauthorized server name change').catch(() => {});
      }
      if (oldGuild.icon !== newGuild.icon) {
        changes.push('**Server icon changed**');
        const icon = oldGuild.icon ? oldGuild.iconURL({ size: 1024, extension: 'png' }) : null;
        await newGuild.setIcon(icon, '[Onyx AntiNuke] Reverting unauthorized server icon change').catch(() => {});
      }

      const banned = await neutralize(guild, executor, 'Unauthorized Guild Update');

      await sendSecurityAlert(
        guild,
        'AntiNuke: Guild Update Neutralized',
        alertBody(
          executor,
          changes.length ? changes : ['**Server settings changed**'],
          `Changes reverted${banned ? ' & offender banned' : ' (ban failed — check role hierarchy)'}.`
        )
      );
    } catch (err) {
      logger.error('Error in antiGuildUpdate event:', err);
    }
  }
};
