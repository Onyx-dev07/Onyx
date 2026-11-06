const db = require('../../database');
const { createEmbed } = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    if (!member.guild) return;

    try {
      const modLogs = db.getModLogs(member.guild.id);
      if (modLogs && modLogs.enabled && modLogs.channelId) {
        const channel = member.guild.channels.cache.get(modLogs.channelId);
        if (channel && channel.isTextBased()) {
          const embed = createEmbed({
            title: 'Member Left',
            description: `${member.user.tag} has left or was kicked from the server.`,
            color: config.colors.error,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            fields: [
              { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
              { name: 'Remaining Members', value: `${member.guild.memberCount}`, inline: true }
            ]
          });
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (err) {
      // Ignore
    }
  }
};

