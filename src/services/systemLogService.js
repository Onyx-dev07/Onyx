// systemLogService.js — sends owner/core diagnostics to the configured
// #system-logs channel without touching the normal audit/event logging flags.

import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from './config/guildConfig.js';
import { createEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

const SYSTEM_LOG_TIMEOUT_MS = 4000;

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), SYSTEM_LOG_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function code(value) {
  return `\`${String(value ?? '').replace(/`/g, "'")}\``;
}

/**
 * @returns {Promise<boolean>} true when the entry was posted to Discord
 */
export async function sendSystemLog(client, guildId, payload, suppliedConfig = null) {
  if (!client || !guildId || !payload) {
    return false;
  }

  try {
    const config = suppliedConfig
      ?? await withTimeout(getGuildConfig(client, guildId), 'system log config read');
    const channelId = config?.logging?.channels?.system;
    if (!channelId) return false;

    const guild = client.guilds?.cache?.get(guildId)
      ?? await client.guilds?.fetch?.(guildId).catch(() => null);
    if (!guild) return false;

    const channel = guild.channels?.cache?.get(channelId)
      ?? await guild.channels?.fetch?.(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      logger.debug(`System log channel ${channelId} is not a text channel`);
      return false;
    }

    const me = guild.members?.me ?? await guild.members?.fetchMe?.().catch(() => null);
    const permissions = me ? channel.permissionsFor(me) : null;
    if (!permissions || !permissions.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])) {
      logger.debug(`Missing permissions in system log channel ${channelId}`);
      return false;
    }

    const fields = Array.isArray(payload.fields)
      ? payload.fields
          .filter(field => field?.name && field?.value !== undefined && field?.value !== null)
          .map(field => ({
            name: String(field.name),
            value: String(field.value),
            inline: field.inline === true,
          }))
      : [];

    const embed = createEmbed({
      title: payload.title || 'System logs',
      description: payload.description || '',
      color: payload.color || 'primary',
      fields,
      footer: payload.footer === undefined ? false : payload.footer,
      timestamp: payload.timestamp === undefined ? true : payload.timestamp,
    });

    await withTimeout(channel.send({ embeds: [embed] }), 'system log send');
    return true;
  } catch (error) {
    logger.debug('Could not send system log:', error.message);
    return false;
  }
}

export { code as systemLogCode };
