// channelAudit.js — shared formatting for channel log events

import { ChannelType } from 'discord.js';
import { formatLogLine } from './logEmbeds.js';

export function channelTypeLabel(channel) {
  return ChannelType[channel?.type] || String(channel?.type ?? 'Unknown');
}

export function channelReference(channel) {
  const mention = typeof channel?.toString === 'function' ? channel.toString() : `#${channel?.name || 'unknown'}`;
  return `${mention} (\`${channel?.id || 'unknown'}\`, ${channelTypeLabel(channel)})`;
}

export function buildChannelBaseLines(channel) {
  return [
    formatLogLine('Channel', channelReference(channel)),
    formatLogLine('Type', channelTypeLabel(channel)),
    formatLogLine('Category', channel?.parent ? `${channel.parent.name} (\`${channel.parent.id}\`)` : 'None'),
  ];
}
