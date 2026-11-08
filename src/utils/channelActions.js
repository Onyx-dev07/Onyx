const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const { actionEmbed } = require('./embeds');
const { actionButtons } = require('./moderation');

function controlRow(state, channelId) {
  if (state === 'locked') {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`unlock_channel:${channelId}`)
        .setLabel('Unlock')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('mod_delete_log')
        .setLabel('Delete log')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lock_channel:${channelId}`)
      .setLabel('Lock')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('mod_delete_log')
      .setLabel('Delete log')
      .setStyle(ButtonStyle.Secondary)
  );
}

function channelStatePayload({ channel, moderator, state, reason = 'No reason provided' }) {
  const locked = state === 'locked';

  return {
    embeds: [actionEmbed({
      title: locked ? 'Channel Locked' : 'Channel Unlocked',
      moderator: `<@${moderator.id}>`,
      reason,
      fields: [
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'State', value: locked ? 'Locked' : 'Unlocked', inline: true }
      ],
      color: locked ? config.colors.error : config.colors.success
    })],
    components: [controlRow(state, channel.id), actionButtons()]
  };
}

module.exports = { channelStatePayload };
