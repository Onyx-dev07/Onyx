const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'slowmode',
  aliases: ['slow'],
  description: 'Sets the slowmode rate limit for the current channel (0 to 21600 seconds).',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Sets the slowmode rate limit for the current channel (0 to 21600 seconds).')
    .addIntegerOption(option =>
      option.setName('seconds')
        .setDescription('Slowmode duration in seconds (0 to disable)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    try {
      await interaction.channel.setRateLimitPerUser(seconds);
      const desc = seconds === 0 ? 'Slowmode has been disabled.' : `Slowmode set to **${seconds}s**.`;
      await interaction.reply({
        embeds: [actionEmbed({
          title: 'Slowmode Updated',
          icon: 'clock',
          moderator: `<@${interaction.user.id}>`,
          reason: desc,
          fields: [{ name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }]
        })]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to set slowmode: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args) {
    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({ embeds: [errorEmbed('Please provide a valid slowmode between 0 and 21600 seconds.')] });
    }

    try {
      await message.channel.setRateLimitPerUser(seconds);
      const desc = seconds === 0 ? 'Slowmode has been disabled.' : `Slowmode set to **${seconds}s**.`;
      await message.reply({
        embeds: [actionEmbed({
          title: 'Slowmode Updated',
          icon: 'clock',
          moderator: `<@${message.author.id}>`,
          reason: desc,
          fields: [{ name: 'Channel', value: `<#${message.channel.id}>`, inline: true }]
        })]
      });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed to set slowmode: ${err.message}`)] });
    }
  }
};
