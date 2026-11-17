import { SlashCommandBuilder } from 'discord.js';
import { moderationEmbed } from '../../utils/embeds.js';

function relativeAge(deletedAt) {
  const seconds = Math.max(0, Math.floor((Date.now() - deletedAt) / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Quiet receipt in the same style as !lock and !nick: no title, footer,
// timestamp, or status emoji.
function snipeDescription(snipe) {
  const author = snipe.authorId ? `<@${snipe.authorId}>` : 'Unknown user';
  const body = snipe.content?.trim() || '*(no text)*';
  const lines = [`${author} · ${relativeAge(snipe.deletedAt)}`, '', body];

  for (const url of snipe.attachments || []) {
    lines.push('', `[Attachment](${url})`);
  }

  return lines.join('\n');
}

export default {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show the most recently deleted message in this channel.')
    .setDMPermission(false),
  category: 'Moderation',

  async execute(interaction, config, client) {
    const channelId = interaction.channel?.id || interaction.channelId;
    const snipe = client?.snipes?.get(channelId);

    if (!snipe) {
      return interaction.reply({
        embeds: [moderationEmbed('No recently deleted messages in this channel.', 'warning')],
      });
    }

    return interaction.reply({
      embeds: [moderationEmbed(snipeDescription(snipe), 'primary')],
    });
  },
};
