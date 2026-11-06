const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, UI, cardAuthor, quote, muted, code } = require('../../utils/embeds');

function roleList(member) {
  if (!member) return 'Not in server';

  const roles = member.roles.cache
    .filter(role => role.id !== member.guild.id)
    .sort((a, b) => b.position - a.position);

  if (!roles.size) return `${UI.inactive} None`;

  const shown = roles.first(10).map(role => `${role}`).join(' ');
  const extra = roles.size > 10 ? ` +${roles.size - 10}` : '';
  let value = `${shown}${extra}`;

  if (value.length > 1024) value = `${value.slice(0, 1021)}...`;
  return value;
}

function getUserEmbed(user, member) {
  const joinedAt = member?.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
    : null;

  const summary = [
    member ? 'Member of this server' : 'Not a member of this server',
    joinedAt ? `joined ${joinedAt}` : null,
    user.bot ? 'application account' : 'human account'
  ].filter(Boolean).join(` ${UI.separator} `);

  const topRole = member?.roles?.highest && member.roles.highest.id !== member.guild.id
    ? `${member.roles.highest}`
    : 'None';

  return createEmbed({
    author: cardAuthor('User information', user.displayAvatarURL({ size: 128 })),
    title: user.username,
    description: [
      quote(summary),
      muted(`ID ${UI.separator} ${code(user.id)}`)
    ].join('\n'),
    thumbnail: user.displayAvatarURL({ size: 256 }),
    fields: [
      { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Top role', value: topRole, inline: true },
      { name: 'Account', value: user.bot ? 'Application' : 'Human', inline: true },
      { name: 'Roles', value: roleList(member) }
    ]
  });
}

module.exports = {
  name: 'userinfo',
  aliases: ['whois', 'user'],
  description: 'Displays detailed information about a Discord user.',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays detailed information about a Discord user.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to inspect')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    await interaction.reply({ embeds: [getUserEmbed(user, member)] });
  },

  async executePrefix(message, args) {
    let user = message.mentions.users.first();
    if (!user && args[0]) {
      user = await message.client.users.fetch(args[0]).catch(() => null);
    }
    if (!user) user = message.author;

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    await message.reply({ embeds: [getUserEmbed(user, member)] });
  }
};
