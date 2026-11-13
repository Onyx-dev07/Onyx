const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed, UI, cardAuthor, quote, muted, code } = require('../../utils/embeds');

async function getServerEmbed(guild) {
  const owner = await guild.fetchOwner().catch(() => null);
  const textChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText).size;
  const voiceChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildVoice).size;
  const categories = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildCategory).size;
  const boosts = guild.premiumSubscriptionCount || 0;

  return createEmbed({
    author: cardAuthor('Server information', guild.iconURL({ size: 128 })),
    title: guild.name,
    description: [
      quote(`${guild.memberCount.toLocaleString()} members ${UI.separator} ${guild.roles.cache.size.toLocaleString()} roles ${UI.separator} ${boosts} boosts`),
      muted(`ID ${UI.separator} ${code(guild.id)}`)
    ].join('\n'),
    thumbnail: guild.iconURL({ size: 256 }),
    fields: [
      { name: 'Owner', value: owner ? `${owner.user.username}\n${code(owner.id)}` : 'Unknown', inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Boost tier', value: guild.premiumTier ? `Level ${guild.premiumTier}` : 'None', inline: true },
      { name: 'Text channels', value: code(textChannels), inline: true },
      { name: 'Voice channels', value: code(voiceChannels), inline: true },
      { name: 'Categories', value: code(categories), inline: true }
    ]
  });
}

module.exports = {
  name: 'serverinfo',
  aliases: ['guildinfo', 'server'],
  description: 'Displays detailed information about the current Discord server.',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays detailed information about the current Discord server.'),

  async executeSlash(interaction) {
    await interaction.reply({ embeds: [await getServerEmbed(interaction.guild)] });
  },

  async executePrefix(message) {
    await message.reply({ embeds: [await getServerEmbed(message.guild)] });
  }
};
