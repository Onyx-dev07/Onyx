const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// Onyx visual language: near-black surfaces, soft pink accents, title-case
// status headings, and typographic separators instead of decoration.
const DEFAULT_COLOR = 0xf7a8c4;
const BRAND_NAME = String(config.botName || 'Onyx');

// Every card carries the same small status heading so tone is readable
// without relying on color.
const STATUS_TITLES = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information'
};

const STATUS_EMOJI = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

// Action receipts read as one sentence, so every title maps to the verb that
// follows the staff member's name. Titles without an entry keep the quieter
// title-and-fields card used by status panels and failures.
const ACTION_VERBS = {
  'Member Banned': 'Banned',
  'Member Unbanned': 'Unbanned',
  'Member Kicked': 'Kicked',
  'Member Hardbanned': 'Permanently banned',
  'Member Softbanned': 'Soft-banned',
  'Member Timed Out': 'Timed out',
  'Timeout Removed': 'Removed the timeout from',
  'Member Muted': 'Muted',
  'Member Unmuted': 'Unmuted',
  'Member Warned': 'Warned',
  'Warnings Cleared': 'Cleared the warnings of',
  'Member Jailed': 'Jailed',
  'Member Released from Jail': 'Released',
  'Member Dehoisted': 'Dehoisted',
  'Server Dehoisted': 'Dehoisted the server',
  'Nickname Set': 'Set the nickname of',
  'Nickname Cleared': 'Cleared the nickname of',
  'Channel Locked': 'Locked the channel',
  'Channel Unlocked': 'Unlocked the channel',
  'Channel Cleared': 'Cleared the channel',
  'Messages Deleted': 'Deleted messages in the channel',
  'Messages Purged': 'Purged messages in the channel',
  'Slowmode Updated': 'Updated the channel slowmode',
  'Server lockdown active': 'Locked down the server',
  'Server lockdown lifted': 'Lifted the server lockdown',
  'Members Moved': 'Moved members',
  'Voice Disconnect': 'Disconnected',
  'Voice Muted': 'Server-muted',
  'Voice Unmuted': 'Server-unmuted',
  'Voice Deafened': 'Server-deafened',
  'Voice Undeafened': 'Server-undeafened',
  'Direct Message Sent': 'Directly messaged',
  'Reminder Set': 'Set a reminder for',
  'AFK Set': 'Went AFK',
  'Announcement Dispatched': 'Sent an announcement',
  'Emoji Stolen': 'Added an emoji to the server',
  'Sticker Stolen': 'Added a sticker to the server',
  'Prefix Changed': 'Changed the prefix'
};

const UI = {
  active: '●',
  partial: '◐',
  inactive: '○',
  separator: '·',
  bullet: '›',
  dot: '•',
  arrow: '→',
  diamond: '◆',
  progressFull: '━',
  progressEmpty: '─',
  divider: '────────────────────',
  shortDivider: '──────────'
};

/**
 * Returns a thematic token configured in config.json, or an empty string.
 * Unset slots fall back to the typographic marks in UI.
 */
function emoji(name) {
  if (!name) return '';
  return config.emojis?.[name] || '';
}

function withEmoji(name, text) {
  const token = emoji(name);
  return token ? `${token} ${text}` : text;
}

function stateLine(active, label) {
  return `${active ? UI.active : UI.inactive} ${label}`;
}

// Themed status marker used by confirmation receipts and module lists.
// Falls back to the typographic dots when no emoji slot is configured.
function mark(active) {
  return active ? (emoji('enabled') || UI.active) : (emoji('disabled') || UI.inactive);
}

// Approve marker that leads every completed action line.
function approve() {
  return emoji('check') || '✅';
}

// Deny marker that leads blocked and failed action cards.
function deny() {
  return emoji('cross') || '❌';
}

/**
 * Receipt text: a marker-led headline, marker-led detail lines, then muted
 * hints in the "- Run ... / - Onyx Security · Module" shape.
 */
function receiptText({ active = true, headline, lines = [], hint, source }) {
  const marker = mark(active);
  const output = [
    `${marker} **${headline}**`,
    ...lines.filter(Boolean).map(line => `${marker} ${line}`)
  ];

  if (hint) output.push(muted(hint));
  if (source) output.push(`-# Onyx Security ${UI.separator} ${source}`);

  return output.join('\n');
}

// Standalone receipt card for a completed configuration action.
function receiptEmbed(options = {}) {
  return createEmbed({
    description: receiptText(options),
    color: options.active === false ? config.colors.muted : config.colors.success,
  });
}

// Signature brand mark used on security embeds.
function brand(text) {
  return withEmoji('shield', text);
}

// A text-only meter that renders consistently without emoji or images.
function progressBar(value, max = 100, length = 10) {
  const ratio = Math.max(0, Math.min(1, Number(value) / Number(max || 1)));
  const filled = Math.round(ratio * length);
  return `${UI.progressFull.repeat(filled)}${UI.progressEmpty.repeat(length - filled)}`;
}

// Turns a score into a label and accent color for status cards.
function scoreBand(score) {
  if (score >= 90) return { label: 'Fortified', color: config.colors.success };
  if (score >= 75) return { label: 'Strong', color: config.colors.success };
  if (score >= 50) return { label: 'Moderate', color: config.colors.warning };
  return { label: 'Exposed', color: config.colors.error };
}

// Author row shared by cards. Discord renders it above the title.
function cardAuthor(label, iconURL) {
  return iconURL ? { name: label, iconURL } : { name: label };
}

// Default brand row. Pass `author: false` on a card to omit it.
function brandAuthor() {
  const iconURL = config.footer?.iconUrl || undefined;
  return cardAuthor(BRAND_NAME, iconURL);
}

// Block quotes get Discord's soft accent bar, so summaries read as a card header.
function quote(text) {
  return String(text)
    .split('\n')
    .map(line => (line.trim() ? `> ${line}` : '>'))
    .join('\n');
}

// Muted subtext for IDs, hints and metadata.
function muted(text) {
  return `-# ${text}`;
}

function code(value) {
  return `\`${value}\``;
}

function divider(length = 'long') {
  return length === 'short' ? UI.shortDivider : UI.divider;
}

// A quiet bullet list. Pass strings, markup is preserved.
function list(items) {
  return items.map(item => `${UI.bullet} ${item}`).join('\n');
}

// Structured bullet lines used inside security and moderation embeds.
function bullets(items) {
  return items.filter(Boolean).map(item => `${UI.dot} ${item}`).join('\n');
}

// Two-column style rows that stack cleanly on narrow clients.
function keyValues(entries) {
  return entries
    .filter(Boolean)
    .map(([label, value]) => `**${label}**\n${value}`)
    .join('\n\n');
}

// A labeled block: bold label above a value.
function section(label, value) {
  return `**${label}**\n${value}`;
}

// Compact status row used by configuration panels.
function status(label, active, note) {
  return `${stateLine(active, label)}${note ? ` ${UI.separator} ${note}` : ''}`;
}

// Footer defaults to a single word: no marketing line on routine replies.
function footerPayload(options) {
  if (options.footer === false) return null;

  const footer = options.footer === undefined
    ? { text: config.footer?.text || 'ONYX' }
    : options.footer;

  if (!footer || !footer.text) return null;

  const iconURL = footer.iconURL || undefined;
  return { text: footer.text, ...(iconURL ? { iconURL } : {}) };
}

/**
 * Base embed builder.
 *
 * Matches the native Onyx embed theme: no implicit author row, title-case
 * titles, and the global protocol colors. Onyx security cards that need a
 * brand row pass one explicitly.
 *
 * Quiet by default: no timestamp, no marketing footer. Cards that need a
 * timestamp pass `timestamp: true`; replies that need context pass a footer.
 */
function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || config.colors.primary || DEFAULT_COLOR);

  // The shared embed theme adds a footer and timestamp at serialization time
  // unless these markers are present.
  if (options.footer === false) embed[Symbol.for('OnyxNoFooter')] = true;
  if (options.timestamp === false) embed[Symbol.for('OnyxNoTimestamp')] = true;

  if (options.author) {
    embed.setAuthor(options.author);
  }

  if (options.title) {
    embed.setTitle(options.emoji ? withEmoji(options.emoji, options.title) : options.title);
  }

  if (options.description) embed.setDescription(options.description);
  if (options.fields?.length) embed.addFields(options.fields);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);

  if (options.timestamp !== false) embed.setTimestamp();

  const footer = footerPayload(options);
  if (footer) embed.setFooter(footer);

  return embed;
}

// Thin action replies: status emoji, title-case heading, one line, one accent.
function actionReply(kind, description, color) {
  return createEmbed({
    title: `${STATUS_EMOJI[kind] || ''} ${STATUS_TITLES[kind] || ''}`.trim(),
    description: String(description || ''),
    color
  });
}

function successEmbed(description) {
  return actionReply('success', description, config.colors.success);
}

function errorEmbed(description) {
  return actionReply('error', description, config.colors.error);
}

function warningEmbed(description) {
  return actionReply('warning', description, config.colors.warning);
}

function infoEmbed(description) {
  return actionReply('info', description, config.colors.info);
}

// Core security cards use the bot's primary color by default.
function securityEmbed(options = {}) {
  return createEmbed({
    ...options,
    color: options.color || config.colors.primary || config.colors.accent || DEFAULT_COLOR
  });
}

function alertEmbed(options = {}) {
  return securityEmbed({
    ...options,
    title: options.title ? withEmoji(options.alertEmoji || 'alert', options.title) : undefined
  });
}

/**
 * Structured action card.
 *
 * Completed actions render as one sentence led by an approve marker, with the
 * staff member first and the target after the verb:
 *
 *   ✅ **@moderator**: Timed out @user for 5 minutes.
 *   -# Reason · Raiding
 *   -# Expires · in 5 minutes
 *
 * Blocked actions lead with a deny marker and the blocked title instead, since
 * there is no staff action to credit:
 *
 *   ❌ **Kick Blocked**
 *   That member is not in this server.
 *
 * Every other title (status panels, interim state) keeps the older
 * title-and-fields layout so nothing loses its heading.
 */
function actionEmbed(options = {}) {
  const {
    title,
    icon,
    target,
    moderator,
    reason,
    duration,
    dmDelivered,
    fields = [],
    description,
    color = config.colors.primary || config.colors.accent || DEFAULT_COLOR
  } = options;

  const meta = [];
  if (reason) meta.push(`Reason ${UI.separator} ${reason}`);
  for (const field of fields) {
    meta.push(`${field.name} ${UI.separator} ${field.value}`);
  }
  if (dmDelivered !== undefined) {
    meta.push(`Direct message ${UI.separator} ${dmDelivered ? 'Delivered' : 'Failed'}`);
  }

  const verb = ACTION_VERBS[title];
  if (moderator && verb) {
    const sentence = `${approve()} **${moderator}**: ${[
      verb,
      target,
      duration ? `for ${duration}` : null
    ].filter(Boolean).join(' ')}.`;

    return createEmbed({
      description: [sentence, description, ...meta.map(muted)].filter(Boolean).join('\n'),
      color
    });
  }

  if (!moderator && icon === 'cross' && title) {
    return createEmbed({
      description: [`${deny()} **${title}**`, description, ...meta.map(muted)]
        .filter(Boolean)
        .join('\n'),
      color
    });
  }

  const embedFields = [];

  if (target) embedFields.push({ name: 'Target', value: target, inline: true });
  if (moderator) embedFields.push({ name: 'Moderator', value: moderator, inline: true });
  if (duration) embedFields.push({ name: 'Duration', value: duration, inline: true });
  if (dmDelivered !== undefined) {
    embedFields.push({ name: 'Direct Message', value: dmDelivered ? 'Delivered' : 'Failed', inline: true });
  }
  if (reason) embedFields.push({ name: 'Reason', value: reason, inline: false });

  embedFields.push(...fields);

  return createEmbed({
    title: title ? withEmoji(icon || '', title) : undefined,
    description,
    fields: embedFields,
    color
  });
}

module.exports = {
  DEFAULT_COLOR,
  BRAND_NAME,
  STATUS_TITLES,
  STATUS_EMOJI,
  UI,
  emoji,
  withEmoji,
  stateLine,
  mark,
  approve,
  deny,
  ACTION_VERBS,
  receiptText,
  receiptEmbed,
  brand,
  progressBar,
  scoreBand,
  cardAuthor,
  brandAuthor,
  quote,
  muted,
  code,
  divider,
  list,
  bullets,
  keyValues,
  section,
  status,
  createEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  securityEmbed,
  alertEmbed,
  actionEmbed
};
