const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const { actionPayload } = require('../../utils/moderation');
const { lockServer } = require('../../utils/serverLock');

module.exports = {
  name: 'lockdown',
  aliases: ['ld'],
  description: 'Emergency server lockdown: locks all public text channels for @everyone.',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Emergency server lockdown: locks all public text channels for @everyone.'),

  async executeSlash(interaction) {
    await interaction.deferReply();
    const result = await lockServer(interaction.guild);
    await interaction.editReply(actionPayload({
      title: 'Server lockdown active',
      moderator: `<@${interaction.user.id}>`,
      reason: 'Emergency server lockdown',
      fields: [{ name: 'Channels locked', value: `\`${result.count}\``, inline: true }]
    }));
  },

  async executePrefix(message) {
    const sent = await message.reply({ embeds: [infoEmbed('Locking down server channels.')] });
    const result = await lockServer(message.guild);
    await sent.edit(actionPayload({
      title: 'Server lockdown active',
      moderator: `<@${message.author.id}>`,
      reason: 'Emergency server lockdown',
      fields: [{ name: 'Channels locked', value: `\`${result.count}\``, inline: true }]
    }));
  }
};

