const config = require('../../config.json');
const db = require('../database');
const logger = require('./logger');
const { createEmbed } = require('./embeds');

const MAX_SNIPPET_LENGTH = 60;
const MAX_SHOWN_MENTIONS = 20;

function plural(count, singular) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

// "17 minutes and 13 seconds", with days/hours folded in for longer absences.
function formatDuration(ms) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts = [];
  if (days) parts.push(plural(days, 'day'));
  if (hours) parts.push(plural(hours, 'hour'));
  if (minutes) parts.push(plural(minutes, 'minute'));
  if (seconds || parts.length === 0) parts.push(plural(seconds, 'second'));

  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function formatRelative(at, now = Date.now()) {
  return `${formatDuration(now - Number(at || now))} ago`;
}

function messageSnippet(message) {
  const text = String(message.content || '').replace(/\s+/g, ' ').trim();
  if (!text) return '*(no text)*';
  return text.length > MAX_SNIPPET_LENGTH
    ? `${text.slice(0, MAX_SNIPPET_LENGTH - 3)}...`
    : text;
}

// Remember messages that pinged an AFK member so their return notice can show
// what they missed. Self-mentions and bot mentions are ignored.
function trackAfkMentions(message) {
  try {
    if (!message.guild || !message.mentions?.users?.size) return 0;

    let tracked = 0;
    for (const user of message.mentions.users.values()) {
      if (user.id === message.author.id || user.bot) continue;
      if (!db.getAfk(message.guild.id, user.id)) continue;

      const url = message.url ||
        `https://discord.com/channels/${message.guild.id}/${message.channel?.id}/${message.id}`;
      if (db.addAfkMention(message.guild.id, user.id, {
        userId: message.author.id,
        channelId: message.channel?.id,
        snippet: messageSnippet(message),
        url,
        at: Date.now(),
      })) {
        tracked++;
      }
    }
    return tracked;
  } catch (error) {
    logger.warn('Could not track AFK mentions:', error.message);
    return 0;
  }
}

// Clear the author's AFK state and send a quiet, one-card return notice. The
// mention list (if any) is a short history with a jump link per message.
async function handleAfkReturn(message) {
  try {
    const afk = db.getAfk(message.guild.id, message.author.id);
    if (!afk) return false;

    db.removeAfk(message.guild.id, message.author.id);

    const away = formatDuration(Date.now() - Number(afk.timestamp || Date.now()));
    const lines = [`<@${message.author.id}>: Welcome back, you went away ${away}`];

    const mentions = Array.isArray(afk.mentions) ? afk.mentions : [];
    if (mentions.length) {
      lines.push('', `You were mentioned ${plural(mentions.length, 'time')} while away`);

      for (const mention of mentions.slice(-MAX_SHOWN_MENTIONS)) {
        const channel = mention.channelId ? `<#${mention.channelId}>` : 'a channel';
        const relative = formatRelative(mention.at);
        const jump = mention.url ? ` · [Jump](${mention.url})` : '';
        lines.push(`<@${mention.userId}> in ${channel} ${mention.snippet} ${relative}${jump}`);
      }
    }

    await message.reply({
      embeds: [createEmbed({
        description: lines.join('\n'),
        color: config.colors.success,
        footer: false,
        timestamp: false,
      })],
      allowedMentions: { parse: [], repliedUser: false },
    }).catch(() => {});

    return true;
  } catch (error) {
    logger.warn('Could not process AFK return:', error.message);
    return false;
  }
}

module.exports = {
  formatDuration,
  formatRelative,
  messageSnippet,
  trackAfkMentions,
  handleAfkReturn,
};
