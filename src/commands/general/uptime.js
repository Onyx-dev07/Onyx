const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, cardAuthor, quote, muted } = require('../../utils/embeds');

function getUptimeEmbed(client) {
  const totalSeconds = Math.floor(client.uptime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const onlineSince = Math.floor((Date.now() - client.uptime) / 1000);

  return createEmbed({
    author: cardAuthor('Uptime', client.user.displayAvatarURL({ size: 128 })),
    description: [
      quote(`Online for **${days}d ${hours}h ${minutes}m ${seconds}s**`),
      muted(`Started <t:${onlineSince}:F>`)
    ].join('\n')
  });
}

module.exports = {
  name: 'uptime',
  aliases: ['up'],
  description: 'Displays the total running uptime of Onyx.',
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Displays the total running uptime of Onyx.'),

  async executeSlash(interaction, client) {
    await interaction.reply({ embeds: [getUptimeEmbed(client)] });
  },

  async executePrefix(message, args, client) {
    await message.reply({ embeds: [getUptimeEmbed(client)] });
  }
};
