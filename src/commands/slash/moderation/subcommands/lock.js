// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { PermissionFlagsBits } = require('discord.js');

const channelCards = require('../../../../lib/channelLockCard');

function send(interaction, payload, ephemeral = false) {
  return interaction.reply(channelCards.withFlags(payload, ephemeral));
}

module.exports = {
  name: 'lock',
  description: 'Prevent messages in a channel',

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return send(interaction, channelCards.error('Permission Denied', 'You need the **Manage Channels** permission.'), true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return send(interaction, channelCards.error('Missing Permissions', 'I need the **Manage Channels** permission.'), true);

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason });
      return send(interaction, channelCards.locked({
        channel,
        moderator: interaction.user,
      }));
    } catch (error) {
      const text = error.code === 50013
        ? 'I lack the permissions to modify this channel.'
        : 'Failed to lock channel.';
      return send(interaction, channelCards.error('Error', text), true);
    }
  },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
