// joinToCreatePanelService.js — persistent control panels for temporary
// Join-to-Create voice channels. The panel lives in one dedicated text channel
// per server and every control is routed through global component handlers.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from 'discord.js';
import {
  getJoinToCreateConfig,
  getTemporaryChannelInfo,
  saveJoinToCreateConfig,
  updateTemporaryChannelInfo,
} from '../utils/database.js';
import { createEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { sendSystemLog, systemLogCode } from './systemLogService.js';

const INTERFACE_CHANNEL_NAME = 'onyx-voice-interface';

const BUTTONS = [
  ['jvc_lock', '🔒 Lock'],
  ['jvc_unlock', '🔓 Unlock'],
  ['jvc_hide', '🪐 Hide'],
  ['jvc_unhide', '👁️ Unhide'],
  ['jvc_limit', '👥 Limit'],
  ['jvc_invite', '👤 Invite'],
  ['jvc_ban', '🚫 Ban'],
  ['jvc_permit', '✅ Permit'],
  ['jvc_rename', '✏️ Rename'],
  ['jvc_bitrate', '🎧 Bitrate'],
  ['jvc_region', '🗄️ Region'],
  ['jvc_template', '📑 Template'],
  ['jvc_chat', '💬 Chat'],
  ['jvc_waiting', '🕒 Waiting'],
  ['jvc_claim', '👑 Claim'],
  ['jvc_transfer', '🪄 Transfer'],
];

const MODALS = {
  limit: { title: 'Set User Limit', input: 'jvc_limit_input', label: 'Maximum users (0 = unlimited)', placeholder: '0-99' },
  invite: { title: 'Invite Member', input: 'jvc_invite_input', label: 'Member @mention or ID', placeholder: '@username or user ID' },
  ban: { title: 'Ban Member', input: 'jvc_ban_input', label: 'Member @mention or ID', placeholder: '@username or user ID' },
  permit: { title: 'Permit Member', input: 'jvc_permit_input', label: 'Member @mention or ID', placeholder: '@username or user ID' },
  rename: { title: 'Rename Channel', input: 'jvc_rename_input', label: 'New channel name', placeholder: 'Enter new name' },
  bitrate: { title: 'Set Bitrate', input: 'jvc_bitrate_input', label: 'Bitrate in kbps (8-96)', placeholder: 'e.g. 64' },
  template: { title: 'Channel Template', input: 'jvc_template_input', label: 'Template name', placeholder: 'Template save/load' },
  chat: { title: 'Chat Permissions', input: 'jvc_chat_input', label: 'Allow or Deny chat messages', placeholder: 'allow or deny' },
  transfer: { title: 'Transfer Ownership', input: 'jvc_transfer_input', label: 'Member @mention or ID', placeholder: '@username or user ID' },
};

const REGION_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'US East', value: 'us-east' },
  { label: 'US West', value: 'us-west' },
  { label: 'US Central', value: 'us-central' },
  { label: 'EU West', value: 'eu-west' },
  { label: 'EU Central', value: 'eu-central' },
  { label: 'Singapore', value: 'singapore' },
  { label: 'Sydney', value: 'sydney' },
  { label: 'Japan', value: 'japan' },
  { label: 'South Africa', value: 'southafrica' },
];

function everyoneOverwrite(channel) {
  return channel.permissionOverwrites?.cache?.get(channel.guild?.roles?.everyone?.id) ?? null;
}

export function isVoiceLocked(channel) {
  const overwrite = everyoneOverwrite(channel);
  return Boolean(overwrite?.deny?.has(PermissionFlagsBits.Connect));
}

export function isVoiceHidden(channel) {
  const overwrite = everyoneOverwrite(channel);
  return Boolean(overwrite?.deny?.has(PermissionFlagsBits.ViewChannel));
}

export function buildPanelComponents(channelId) {
  const rows = [];

  for (let i = 0; i < BUTTONS.length; i += 4) {
    rows.push(new ActionRowBuilder().addComponents(
      ...BUTTONS.slice(i, i + 4).map(([customId, label]) =>
        new ButtonBuilder()
          .setCustomId(`${customId}:${channelId}`)
          .setLabel(label)
          .setStyle(ButtonStyle.Secondary),
      ),
    ));
  }

  return rows;
}

export function buildRegionComponents(channelId) {
  return [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`jvc_select_region:${channelId}`)
      .setPlaceholder('Select RTC region')
      .addOptions(REGION_OPTIONS),
  )];
}

export async function buildPanelEmbed(client, guildId, channel) {
  const info = await getTemporaryChannelInfo(client, guildId, channel.id);
  const ownerId = info?.ownerId;
  const owner = ownerId
    ? channel.guild.members.cache.get(ownerId)
      ?? await channel.guild.members.fetch(ownerId).catch(() => null)
    : null;

  const state = {
    locked: isVoiceLocked(channel),
    hidden: isVoiceHidden(channel),
  };

  await updateTemporaryChannelInfo(client, guildId, channel.id, state);

  const embed = createEmbed({
    title: 'Onyx Interface',
    description: [
      'Use this panel to manage your voice channel.',
      '',
      `**Channel:** <#${channel.id}>`,
      `**Owner:** ${owner ? `<@${owner.id}>` : 'Unowned — use Claim'}`,
      `**Members:** ${channel.members?.size ?? 0}`,
      `**User Limit:** ${channel.userLimit || 'None'}`,
      `**Bitrate:** ${Math.floor((channel.bitrate ?? 0) / 1000)}kbps`,
      `**Locked:** ${state.locked ? 'Yes' : 'No'}`,
      `**Hidden:** ${state.hidden ? 'Yes' : 'No'}`,
    ].join('\n'),
    color: 'primary',
    footer: false,
    timestamp: false,
  });

  return embed;
}

export async function ensureInterfaceChannel(client, guildId, requestedChannelId = null) {
  let config = await getJoinToCreateConfig(client, guildId);
  const guild = client.guilds?.cache?.get(guildId)
    ?? await client.guilds?.fetch?.(guildId).catch(() => null);
  if (!guild) return null;

  let channel = null;
  if (requestedChannelId || config.interfaceChannelId) {
    const channelId = requestedChannelId || config.interfaceChannelId;
    channel = guild.channels.cache.get(channelId)
      ?? await guild.channels.fetch(channelId).catch(() => null);
  }

  if (!channel || channel.type !== ChannelType.GuildText) {
    channel = guild.channels.cache.find(
      candidate => candidate.type === ChannelType.GuildText && candidate.name === INTERFACE_CHANNEL_NAME,
    ) ?? null;
  }

  if (!channel) {
    const me = guild.members.me ?? await guild.members.fetchMe?.().catch(() => null);
    const overwrites = [
      {
        id: guild.roles.everyone.id,
        type: 0,
        deny: [PermissionFlagsBits.ViewChannel],
        allow: [],
      },
    ];
    if (me) {
      overwrites.push({
        id: me.id,
        type: 1,
        deny: [],
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    channel = await guild.channels.create({
      name: INTERFACE_CHANNEL_NAME,
      type: ChannelType.GuildText,
      topic: 'Onyx voice channel control interfaces.',
      reason: '[Onyx JTC] Voice interface setup',
      permissionOverwrites: overwrites,
    });
  }

  if (!config.interfaceChannelId || config.interfaceChannelId !== channel.id || requestedChannelId) {
    config = await saveJoinToCreateConfig(client, guildId, {
      ...config,
      interfaceChannelId: channel.id,
    }) ? { ...config, interfaceChannelId: channel.id } : config;
  }

  return channel;
}

export async function sendPanel(client, guildId, channel) {
  try {
    const interfaceChannel = await ensureInterfaceChannel(client, guildId);
    if (!interfaceChannel) return null;

    const embed = await buildPanelEmbed(client, guildId, channel);
    const message = await interfaceChannel.send({
      embeds: [embed],
      components: buildPanelComponents(channel.id),
    });

    await updateTemporaryChannelInfo(client, guildId, channel.id, {
      panelChannelId: interfaceChannel.id,
      panelMessageId: message.id,
      locked: isVoiceLocked(channel),
      hidden: isVoiceHidden(channel),
    });

    return message;
  } catch (error) {
    logger.error('Failed to send JTC panel:', error);
    void sendSystemLog(client, guildId, {
      title: 'JTC · Panel failed',
      description: systemLogCode(error?.message || 'Unknown error'),
      color: 'error',
      fields: [
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
      ],
    });
    return null;
  }
}

export async function refreshPanel(client, guildId, channel) {
  try {
    const info = await getTemporaryChannelInfo(client, guildId, channel.id);
    if (!info?.panelMessageId || !info?.panelChannelId) return false;

    const panelChannel = channel.guild.channels.cache.get(info.panelChannelId)
      ?? await channel.guild.channels.fetch(info.panelChannelId).catch(() => null);
    if (!panelChannel) return false;

    const message = panelChannel.messages.cache.get(info.panelMessageId)
      ?? await panelChannel.messages.fetch(info.panelMessageId).catch(() => null);
    if (!message) return false;

    const embed = await buildPanelEmbed(client, guildId, channel);
    await message.edit({
      embeds: [embed],
      components: buildPanelComponents(channel.id),
    });
    return true;
  } catch (error) {
    logger.debug('Could not refresh JTC panel:', error.message);
    return false;
  }
}

export async function deletePanel(client, guildId, channelId) {
  try {
    const info = await getTemporaryChannelInfo(client, guildId, channelId);
    if (!info?.panelMessageId || !info?.panelChannelId) return false;

    const guild = client.guilds?.cache?.get(guildId)
      ?? await client.guilds?.fetch?.(guildId).catch(() => null);
    const panelChannel = guild?.channels?.cache?.get(info.panelChannelId)
      ?? await guild?.channels?.fetch?.(info.panelChannelId).catch(() => null);
    if (!panelChannel) return false;

    const message = await panelChannel.messages.fetch(info.panelMessageId).catch(() => null);
    if (!message) return false;

    await message.delete().catch(() => {});
    return true;
  } catch (error) {
    logger.debug('Could not delete JTC panel:', error.message);
    return false;
  }
}

export async function isPanelOwner(client, guildId, channelId, userId) {
  const info = await getTemporaryChannelInfo(client, guildId, channelId);
  if (info?.ownerId === userId) return true;

  const guild = client.guilds?.cache?.get(guildId)
    ?? await client.guilds?.fetch?.(guildId).catch(() => null);
  const member = guild?.members?.cache?.get(userId)
    ?? await guild?.members?.fetch?.(userId).catch(() => null);

  return Boolean(member?.permissions?.has?.(PermissionFlagsBits.ManageChannels));
}

export function getModalConfig(type) {
  return MODALS[type] ?? null;
}

export function getRegionOptions() {
  return REGION_OPTIONS;
}
