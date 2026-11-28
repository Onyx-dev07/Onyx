// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { PermissionFlagsBits } = require('discord.js');

const channelCards = require('../../../lib/channelLockCard');

module.exports = {
  name: 'unlock',
  description: 'Unlock a channel',
  aliases: [],

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply(channelCards.error('Permission Denied', 'You need the **Manage Channels** permission.'));

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply(channelCards.error('Missing Permissions', 'I need the **Manage Channels** permission.'));

    const channel = message.mentions.channels.first() || message.channel;

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
      return message.reply(channelCards.unlocked({
        channel,
        moderator: message.author,
      }));
    } catch (error) {
      const text = error.code === 50013
        ? 'I lack the permissions to modify this channel.'
        : 'Failed to unlock channel.';
      return message.reply(channelCards.error('Error', text));
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
