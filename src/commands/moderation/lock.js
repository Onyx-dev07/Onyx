const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

function lockRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lock_toggle:${channelId}`).setLabel('🔓 Unlock').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`lock_lock:${channelId}`).setLabel('🔒 Lock').setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  name: 'lock',
  description: 'Locks the channel to prevent @everyone from sending messages.',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Locks the channel to prevent @everyone from sending messages.'),

  async executeSlash(interaction) {
    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });
      await interaction.reply({
        embeds: [actionEmbed({
          title: 'Channel Locked',
          moderator: `<@${interaction.user.id}>`,
          reason: 'Channel locked',
          fields: [{ name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }]
        })],
        components: [lockRow(interaction.channel.id)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to lock channel: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message) {
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });
      await message.reply({
        embeds: [actionEmbed({
          title: 'Channel Locked',
          moderator: `<@${message.author.id}>`,
          reason: 'Channel locked',
          fields: [{ name: 'Channel', value: `<#${message.channel.id}>`, inline: true }]
        })]
      });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed to lock channel: ${err.message}`)] });
    }
  },

  async handleButton(interaction) {
    const [action, channelId] = interaction.customId.split(':');
    const guild = interaction.guild;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed('Channel not found.')], flags: MessageFlags.Ephemeral });
    }

    if (action === 'lock_toggle') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
      return interaction.update({
        embeds: [actionEmbed({
          title: 'Channel Unlocked',
          moderator: `<@${interaction.user.id}>`,
          reason: 'Channel unlocked',
          fields: [{ name: 'Channel', value: `<#${channelId}>`, inline: true }]
        })],
        components: [lockRow(channelId)]
      });
    }

    if (action === 'lock_lock') {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
      return interaction.update({
        embeds: [actionEmbed({
          title: 'Channel Locked',
          moderator: `<@${interaction.user.id}>`,
          reason: 'Channel locked',
          fields: [{ name: 'Channel', value: `<#${channelId}>`, inline: true }]
        })],
        components: [lockRow(channelId)]
      });
    }

    return false;
  }
};
