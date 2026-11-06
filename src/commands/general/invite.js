const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');
const { createEmbed, cardAuthor, quote, muted } = require('../../utils/embeds');
const config = require('../../../config.json');

function getInviteData(client) {
  const inviteUrl = client.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: [PermissionFlagsBits.Administrator]
  });

  const embed = createEmbed({
    author: cardAuthor('Invite', client.user.displayAvatarURL({ size: 128 })),
    title: `Add ${config.botName}`,
    description: [
      quote(`Full moderation, security and automation for your server`),
      muted('Requests administrator access and application commands')
    ].join('\n')
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(`Invite ${config.botName}`)
      .setStyle(ButtonStyle.Link)
      .setURL(inviteUrl)
  );

  return { embed, row };
}

module.exports = {
  name: 'invite',
  aliases: ['inv'],
  description: 'Generates an invite link to add Onyx to your server.',
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Generates an invite link to add Onyx to your server.'),

  async executeSlash(interaction, client) {
    const { embed, row } = getInviteData(client);
    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async executePrefix(message, args, client) {
    const { embed, row } = getInviteData(client);
    await message.reply({ embeds: [embed], components: [row] });
  }
};
