const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { actionPayload, failurePayload, actionButtons } = require('../../utils/moderation');

function unlockRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`unlock_lock:${channelId}`).setLabel('🔒 Lock').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`unlock_toggle:${channelId}`).setLabel('🔓 Unlock').setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  name: 'unlock',
  description: 'Unlocks the channel to allow @everyone to send messages.',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlocks the channel to allow @everyone to send messages.'),

  async executeSlash(interaction) {
    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });
      await interaction.reply({
        ...actionPayload({
          title: 'Channel Unlocked',
          moderator: `<@${interaction.user.id}>`,
          reason: 'Channel unlocked',
          fields: [{ name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }]
        }),
        components: [unlockRow(interaction.channel.id), actionButtons()]
      });
    } catch (err) {
      await interaction.reply({
        ...failurePayload('Unlock Blocked', `Failed to unlock channel: ${err.message}`),
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async executePrefix(message) {
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null
      });
      await message.reply({
        ...actionPayload({
          title: 'Channel Unlocked',
          moderator: `<@${message.author.id}>`,
          reason: 'Channel unlocked',
          fields: [{ name: 'Channel', value: `<#${message.channel.id}>`, inline: true }]
        }),
        components: [unlockRow(message.channel.id), actionButtons()]
      });
    } catch (err) {
      await message.reply(failurePayload('Unlock Blocked', `Failed to unlock channel: ${err.message}`));
    }
  },

  async handleButton(interaction) {
    const [action, channelId] = interaction.customId.split(':');
    const guild = interaction.guild;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.reply({
        ...failurePayload('Unlock Blocked', 'Channel not found.'),
        flags: MessageFlags.Ephemeral
      });
    }

    if (action === 'unlock_lock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
      return interaction.update({
        ...actionPayload({
          title: 'Channel Locked',
          moderator: `<@${interaction.user.id}>`,
          reason: 'Channel locked',
          fields: [{ name: 'Channel', value: `<#${channelId}>`, inline: true }]
        }),
        components: [unlockRow(channelId), actionButtons()]
      });
    }

    if (action === 'unlock_toggle') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
      return interaction.update({
        ...actionPayload({
          title: 'Channel Unlocked',
          moderator: `<@${interaction.user.id}>`,
          reason: 'Channel unlocked',
          fields: [{ name: 'Channel', value: `<#${channelId}>`, inline: true }]
        }),
        components: [unlockRow(channelId), actionButtons()]
      });
    }

    return false;
  }
};
