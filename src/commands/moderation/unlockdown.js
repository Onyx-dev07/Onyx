const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { actionEmbed, infoEmbed } = require('../../utils/embeds');
const { unlockServer } = require('../../utils/serverLock');

module.exports = {
  name: 'unlockdown',
  aliases: ['uld'],
  description: 'Lifts server lockdown: restores normal send permissions for all public channels.',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('unlockdown')
    .setDescription('Lifts server lockdown: restores normal send permissions for all public channels.'),

  async executeSlash(interaction) {
    await interaction.deferReply();
    const result = await unlockServer(interaction.guild);
    await interaction.editReply({
      embeds: [actionEmbed({
        title: 'Server lockdown lifted',
        moderator: `<@${interaction.user.id}>`,
        reason: 'Lockdown lifted',
        fields: [{ name: 'Channels restored', value: `\`${result.count}\``, inline: true }]
      })]
    });
  },

  async executePrefix(message) {
    const sent = await message.reply({ embeds: [infoEmbed('Lifting server lockdown.')] });
    const result = await unlockServer(message.guild);
    await sent.edit({
      embeds: [actionEmbed({
        title: 'Server lockdown lifted',
        moderator: `<@${message.author.id}>`,
        reason: 'Lockdown lifted',
        fields: [{ name: 'Channels restored', value: `\`${result.count}\``, inline: true }]
      })]
    });
  }
};

