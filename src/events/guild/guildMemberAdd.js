const db = require('../../database');
const logger = require('../../utils/logger');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (!member.guild) return;

    // 1. Autorole system
    try {
      const autorole = db.getAutorole(member.guild.id);
      if (autorole && autorole.enabled && autorole.roleId) {
        const role = member.guild.roles.cache.get(autorole.roleId);
        if (role && member.guild.members.me.permissions.has('ManageRoles')) {
          await member.roles.add(role).catch(err => {
            logger.warn(`Failed to assign autorole in ${member.guild.name}:`, err.message);
          });
        }
      }
    } catch (err) {
      logger.error('Error handling autorole:', err);
    }

    // 2. Welcome message system
    try {
      const welcome = db.getWelcome(member.guild.id);
      if (welcome && welcome.enabled && welcome.channelId) {
        const channel = member.guild.channels.cache.get(welcome.channelId);
        if (channel && channel.isTextBased()) {
          const rawMessage = welcome.message || 'Welcome to {server}, {user}! We now have {memberCount} members.';
          const formatted = rawMessage
            .replace(/{user\.mention}/g, `<@${member.id}>`)
            .replace(/{user\.tag}/g, member.user.tag)
            .replace(/{user\.name}/g, member.user.username)
            .replace(/{guild\.name}/g, member.guild.name)
            .replace(/{guild\.count}/g, member.guild.memberCount)
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount);

          const embed = createEmbed({
            title: 'Welcome',
            description: formatted,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            fields: [
              { name: 'Member', value: `${member.user.tag}`, inline: true },
              { name: 'Joined', value: `${member.guild.memberCount} members`, inline: true },
              { name: 'Account created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            ]
          });

          await channel.send({ content: `<@${member.id}>`, embeds: [embed] }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error('Error handling welcome message:', err);
    }
  }
};

