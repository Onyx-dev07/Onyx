const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const { createEmbed, UI, cardAuthor, quote, muted, code } = require('../../utils/embeds');
const config = require('../../../config.json');
const os = require('os');

function getInfoEmbed(client) {
  const uptime = Math.floor(client.uptime / 1000);
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

  return createEmbed({
    author: cardAuthor('Bot information', client.user.displayAvatarURL({ size: 128 })),
    title: config.botName,
    description: [
      quote(`${UI.active} Online ${UI.separator} version ${config.version} ${UI.separator} ${client.guilds.cache.size.toLocaleString()} servers`),
      muted(`ID ${UI.separator} ${code(client.user.id)}`)
    ].join('\n'),
    thumbnail: client.user.displayAvatarURL({ size: 256 }),
    fields: [
      { name: 'Servers', value: code(client.guilds.cache.size.toLocaleString()), inline: true },
      { name: 'Users', value: code(totalMembers.toLocaleString()), inline: true },
      { name: 'Commands', value: code(client.commands.size.toLocaleString()), inline: true },
      { name: 'Uptime', value: code(uptimeStr), inline: true },
      { name: 'Latency', value: code(`${client.ws.ping}ms`), inline: true },
      { name: 'Memory', value: code(`${memoryUsed} MB`), inline: true },
      { name: 'Node.js', value: code(process.version), inline: true },
      { name: 'discord.js', value: code(`v${djsVersion}`), inline: true },
      { name: 'Platform', value: code(`${os.type()} ${os.arch()}`), inline: true }
    ]
  });
}

module.exports = {
  name: 'botinfo',
  aliases: ['info', 'stats', 'bot'],
  description: 'Displays detailed statistics and information about Onyx.',
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Displays detailed statistics and information about Onyx.'),

  async executeSlash(interaction) {
    await interaction.reply({ embeds: [getInfoEmbed(interaction.client)] });
  },

  async executePrefix(message) {
    await message.reply({ embeds: [getInfoEmbed(message.client)] });
  }
};
