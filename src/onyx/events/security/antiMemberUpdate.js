const { PermissionFlagsBits } = require('discord.js');
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

const dangerousPermissions = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.MentionEveryone
];

function isDangerous(role) {
  return dangerousPermissions.some(permission => role.permissions.has(permission));
}

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    if (!newMember.guild) return;
    const guild = newMember.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    // Only react to newly granted dangerous roles
    const addedRole = newMember.roles.cache.find(role => !oldMember.roles.cache.has(role.id) && isDangerous(role));
    if (!addedRole) return;

    try {
      const entry = await fetchAuditEntry(guild, AuditLogEvent.MemberRoleUpdate, { targetId: newMember.id });
      if (!entry) return;

      const executor = entry.executor;
      if (isTrusted(guild, executor.id, client, 'memup')) return;

      logger.warn(`[AntiNuke] Unauthorized dangerous role grant to ${newMember.user.tag} in ${guild.name} by ${executor.tag}! Mitigating...`);

      await newMember.roles.remove(addedRole, '[Onyx AntiNuke] Reverting unauthorized dangerous role grant').catch(() => {});
      const banned = await neutralize(
        guild,
        executor,
        `Granted dangerous role @${addedRole.name} to ${newMember.user.tag}`
      );

      await sendSecurityAlert(
        guild,
        'AntiNuke: Dangerous Role Assignment Neutralized',
        alertBody(
          executor,
          [
            `**Target Member:** ${newMember.user.tag} (\`${newMember.id}\`)`,
            `**Role Granted:** @${addedRole.name} (\`${addedRole.id}\`)`
          ],
          `Role removed from member${banned ? ' & offender banned' : ' (ban failed — check role hierarchy)'}.`
        )
      );
    } catch (err) {
      logger.error('Error in antiMemberUpdate event:', err);
    }
  }
};
