const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// Onyx visual language: dark charcoal cards, one ONYX red accent stripe,
// typographic separators instead of decoration.
const DEFAULT_COLOR = 0x2b2d31;
const BRAND_NAME = String(config.botName || 'ONYX').toUpperCase();

// Every card carries the same small status heading so tone is readable
// without relying on color.
const STATUS_HEADINGS = {
  success: 'SUCCESS',
  error: 'ERROR',
  warning: 'WARNING',
  info: 'NOTICE'
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
    footer: false
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
    .map(([label, value]) => `**${label.toUpperCase()}**\n${value}`)
    .join('\n\n');
}

// A labeled block: small caps label above a value.
function section(label, value) {
  return `**${String(label).toUpperCase()}**\n${value}`;
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
 * Every card inherits the same ONYX author row and the same accent stripe.
 * Quiet by default: no timestamp, no marketing footer. Cards that need a
 * timestamp pass `timestamp: true`; replies that need context pass a footer.
 */
function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || config.colors.accent || DEFAULT_COLOR);

  if (options.author !== false) {
    embed.setAuthor(options.author || brandAuthor());
  }

  if (options.title) {
    embed.setTitle(options.emoji ? withEmoji(options.emoji, options.title) : options.title);
  }

  if (options.description) embed.setDescription(options.description);
  if (options.fields?.length) embed.addFields(options.fields);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);

  if (options.timestamp === true) embed.setTimestamp();

  const footer = footerPayload(options);
  if (footer) embed.setFooter(footer);

  return embed;
}

// Thin action replies: a small status heading, one line, one accent, no footer.
function actionReply(emojiName, description, color) {
  const heading = STATUS_HEADINGS[emojiName];
  const body = withEmoji(emojiName, description);

  return createEmbed({
    description: heading ? `${muted(heading)}\n${body}` : body,
    color,
    footer: false
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

// Core security cards use the accent color by default.
function securityEmbed(options = {}) {
  return createEmbed({
    ...options,
    color: options.color || config.colors.accent || config.colors.primary || DEFAULT_COLOR
  });
}

function alertEmbed(options = {}) {
  return securityEmbed({
    ...options,
    title: options.title ? withEmoji(options.alertEmoji || 'alert', options.title) : undefined
  });
}

/**
 * Structured moderation card: target, moderator, reason, duration and DM status.
 * Compact inline fields keep action logs scannable; no decorative icons.
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
    color = config.colors.accent || config.colors.primary || DEFAULT_COLOR
  } = options;

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
    color,
    footer: false
  });
}

module.exports = {
  DEFAULT_COLOR,
  BRAND_NAME,
  STATUS_HEADINGS,
  UI,
  emoji,
  withEmoji,
  stateLine,
  mark,
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
