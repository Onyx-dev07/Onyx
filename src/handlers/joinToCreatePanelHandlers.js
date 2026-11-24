// joinToCreatePanelHandlers.js — component/modal actions for the persistent
// Join-to-Create voice interface.

import {
  ActionRowBuilder,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getTemporaryChannelInfo, updateTemporaryChannelInfo } from '../utils/database.js';
import {
  buildPanelComponents,
  buildPanelEmbed,
  buildRegionComponents,
  getModalConfig,
  isPanelOwner,
  refreshPanel,
} from '../services/joinToCreatePanelService.js';
import { compactEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

const BUTTON_ACTIONS = new Set([
  'jvc_lock',
  'jvc_unlock',
  'jvc_hide',
  'jvc_unhide',
  'jvc_limit',
  'jvc_invite',
  'jvc_ban',
  'jvc_permit',
  'jvc_rename',
  'jvc_bitrate',
  'jvc_region',
  'jvc_template',
  'jvc_chat',
  'jvc_waiting',
  'jvc_claim',
  'jvc_transfer',
]);

function notice(text, color = 'error') {
  return compactEmbed(text, color);
}

async function reply(interaction, text, color = 'error') {
  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ embeds: [notice(text, color)] }).catch(() => {});
  }
  return interaction.reply({
    embeds: [notice(text, color)],
    flags: MessageFlags.Ephemeral,
  });
}

async function getVoiceChannel(interaction, args) {
  const channelId = args?.[0];
  const channel = interaction.guild?.channels?.cache?.get(channelId)
    ?? await interaction.guild?.channels?.fetch?.(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildVoice) return null;
  return channel;
}

async function authorize(interaction, client, channel, action) {
  if (action === 'jvc_claim') return true;
  return isPanelOwner(client, interaction.guild.id, channel.id, interaction.user.id);
}

async function updateFromPanel(interaction, client, channel) {
  await refreshPanel(client, interaction.guild.id, channel);
  const embed = await buildPanelEmbed(client, interaction.guild.id, channel);

  if (interaction.isButton()) {
    return interaction.update({
      embeds: [embed],
      components: buildPanelComponents(channel.id),
    });
  }

  return reply(interaction, 'Voice interface updated.', 'success');
}

function buildModal(type, channelId) {
  const config = getModalConfig(type);
  if (!config) return null;

  const modal = new ModalBuilder()
    .setCustomId(`jvc_modal_${type}:${channelId}`)
    .setTitle(config.title);

  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(config.input)
      .setLabel(config.label)
      .setPlaceholder(config.placeholder)
      .setStyle(TextInputStyle.Short)
      .setRequired(true),
  ));

  return modal;
}

async function resolveMember(interaction, raw) {
  const id = String(raw ?? '').replace(/[<@!>]/g, '').trim();
  if (!id) return null;

  return interaction.guild.members.cache.get(id)
    ?? await interaction.guild.members.fetch(id).catch(() => null);
}

export async function handleButton(interaction, client, args = []) {
  const action = interaction.customId.split(':')[0];
  if (!BUTTON_ACTIONS.has(action)) return false;

  const channel = await getVoiceChannel(interaction, args);
  if (!channel) return reply(interaction, 'That voice channel no longer exists.');

  if (!(await authorize(interaction, client, channel, action))) {
    return reply(interaction, 'You do not own this voice channel.');
  }

  try {
    if (action === 'jvc_lock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: false,
      }, '[Onyx JTC] Lock');
      return updateFromPanel(interaction, client, channel);
    }

    if (action === 'jvc_unlock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: null,
      }, '[Onyx JTC] Unlock');
      return updateFromPanel(interaction, client, channel);
    }

    if (action === 'jvc_hide') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false,
      }, '[Onyx JTC] Hide');
      return updateFromPanel(interaction, client, channel);
    }

    if (action === 'jvc_unhide') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: null,
      }, '[Onyx JTC] Unhide');
      return updateFromPanel(interaction, client, channel);
    }

    if (action === 'jvc_region') {
      return interaction.update({ components: buildRegionComponents(channel.id) });
    }

    if (action === 'jvc_waiting') {
      return reply(interaction, 'Waiting room is not configured for this server yet.', 'warning');
    }

    if (action === 'jvc_claim') {
      const info = await getTemporaryChannelInfo(client, interaction.guild.id, channel.id);
      if (info?.ownerId) {
        return reply(interaction, `This voice channel is already owned by <@${info.ownerId}>.`);
      }
      await updateTemporaryChannelInfo(client, interaction.guild.id, channel.id, {
        ownerId: interaction.user.id,
      });
      return updateFromPanel(interaction, client, channel);
    }

    const modal = buildModal(action.replace('jvc_', ''), channel.id);
    if (!modal) return reply(interaction, 'Unknown voice interface action.');
    return interaction.showModal(modal);
  } catch (error) {
    logger.error('JTC panel button failed:', error);
    return reply(interaction, `Failed: ${error.message}`);
  }
}

export async function handleSelect(interaction, client, args = []) {
  if (interaction.customId.split(':')[0] !== 'jvc_select_region') return false;

  const channel = await getVoiceChannel(interaction, args);
  if (!channel) return reply(interaction, 'That voice channel no longer exists.');

  if (!(await isPanelOwner(client, interaction.guild.id, channel.id, interaction.user.id))) {
    return reply(interaction, 'You do not own this voice channel.');
  }

  const region = interaction.values?.[0];
  try {
    await channel.setRTCRegion(region === 'default' ? null : region, '[Onyx JTC] Region');
    return updateFromPanel(interaction, client, channel);
  } catch (error) {
    logger.debug('Could not set RTC region:', error.message);
    return reply(interaction, `Failed to set region: ${error.message}`);
  }
}

export async function handleModal(interaction, client, args = []) {
  const action = interaction.customId.split(':')[0];
  if (!action.startsWith('jvc_modal_')) return false;

  const type = action.replace('jvc_modal_', '');
  const config = getModalConfig(type);
  if (!config) return reply(interaction, 'Unknown voice interface action.');

  const channel = await getVoiceChannel(interaction, args);
  if (!channel) return reply(interaction, 'That voice channel no longer exists.');

  if (!(await isPanelOwner(client, interaction.guild.id, channel.id, interaction.user.id))) {
    return reply(interaction, 'You do not own this voice channel.');
  }

  const value = interaction.fields.getTextInputValue(config.input)?.trim();

  try {
    if (type === 'limit') {
      const limit = Number(value);
      if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
        return reply(interaction, 'Enter a whole number between 0 and 99.');
      }
      await channel.setUserLimit(limit, '[Onyx JTC] Limit');
      await refreshPanel(client, interaction.guild.id, channel);
      return reply(interaction, `User limit set to ${limit === 0 ? 'unlimited' : limit}.`, 'success');
    }

    if (['invite', 'ban', 'permit'].includes(type)) {
      const target = await resolveMember(interaction, value);
      if (!target) return reply(interaction, 'Member not found.');

      if (type === 'ban') {
        await channel.permissionOverwrites.edit(target.id, {
          Connect: false,
          ViewChannel: false,
        }, '[Onyx JTC] Ban');
        if (target.voice.channelId === channel.id) {
          await target.voice.disconnect('[Onyx JTC] Banned from channel').catch(() => {});
        }
      } else {
        await channel.permissionOverwrites.edit(target.id, {
          Connect: true,
          ViewChannel: true,
        }, `[Onyx JTC] ${type}`);
      }

      await refreshPanel(client, interaction.guild.id, channel);
      return reply(interaction, `${type === 'ban' ? 'Banned' : 'Updated'} <@${target.id}> for <#${channel.id}>.`, 'success');
    }

    if (type === 'rename') {
      if (!value) return reply(interaction, 'Provide a channel name.');
      await channel.setName(value, '[Onyx JTC] Rename');
      await refreshPanel(client, interaction.guild.id, channel);
      return reply(interaction, `Renamed to ${value}.`, 'success');
    }

    if (type === 'bitrate') {
      const kbps = Number(value);
      if (!Number.isInteger(kbps) || kbps < 8 || kbps > 96) {
        return reply(interaction, 'Bitrate must be between 8 and 96 kbps.');
      }
      await channel.setBitrate(kbps * 1000, '[Onyx JTC] Bitrate');
      await refreshPanel(client, interaction.guild.id, channel);
      return reply(interaction, `Bitrate set to ${kbps}kbps.`, 'success');
    }

    if (type === 'chat') {
      const normalized = value.toLowerCase();
      if (!['allow', 'deny'].includes(normalized)) {
        return reply(interaction, 'Use "allow" or "deny".');
      }
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: normalized === 'allow' ? null : false,
      }, '[Onyx JTC] Chat');
      await refreshPanel(client, interaction.guild.id, channel);
      return reply(interaction, `Chat ${normalized}ed.`, 'success');
    }

    if (type === 'transfer') {
      const target = await resolveMember(interaction, value);
      if (!target) return reply(interaction, 'Member not found.');
      if (target.id === interaction.user.id) return reply(interaction, 'You already own this channel.');

      await updateTemporaryChannelInfo(client, interaction.guild.id, channel.id, {
        ownerId: target.id,
      });
      await refreshPanel(client, interaction.guild.id, channel);
      return reply(interaction, `Ownership transferred to <@${target.id}>.`, 'success');
    }

    if (type === 'template') {
      return reply(interaction, 'Template save/load will be available in a future update.', 'warning');
    }

    return reply(interaction, 'Unknown voice interface action.');
  } catch (error) {
    logger.error('JTC panel modal failed:', error);
    return reply(interaction, `Failed: ${error.message}`);
  }
}
