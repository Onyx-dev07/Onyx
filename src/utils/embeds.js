// embeds.js — Onyx's centralized embed theme.

import { EmbedBuilder } from 'discord.js';
import { getColor, botConfig } from '../config/bot.js';
import { DEFAULT_FOOTER, EMOJI, statusTitle } from './theme.js';

const EMBED_FOOTER_SYMBOL = Symbol('OnyxFooterText');
const EMBED_BASE_DESCRIPTION_SYMBOL = Symbol('OnyxBaseDescription');
const EMBED_NO_FOOTER_SYMBOL = Symbol('OnyxNoFooter');
const EMBED_NO_TIMESTAMP_SYMBOL = Symbol('OnyxNoTimestamp');

function sanitizeEmbedText(text = '') {
  if (typeof text !== 'string') {
    return text;
  }

  return text
    .replace(/[ \t]+/g, ' ')   // collapse runs of spaces/tabs
    .replace(/[ \t]\n/g, '\n') // trim trailing spaces before newlines
    .replace(/\n[ \t]/g, '\n') // trim leading spaces after newlines
    .replace(/\n{3,}/g, '\n\n') // keep at most one blank line
    .trim();
}

function sanitizeEmbedField(field) {
  if (!field || typeof field !== 'object') {
    return field;
  }

  return {
    ...field,
    name: sanitizeEmbedText(field.name),
    value: sanitizeEmbedText(field.value),
  };
}

// Older commands used a handful of literal colors. Route those into the
// semantic theme so no module keeps the previous palette.
const LEGACY_COLORS = new Map([
  [0x2b2d31, 'secondary'],
  [0x24262a, 'secondary'],
  [0x2f3136, 'secondary'],
  [0x202225, 'secondary'],
  [0x1b1c1e, 'dark'],
  [0xff0000, 'error'],
  [0xf04747, 'error'],
  [0xe74c3c, 'error'],
  [0xed4245, 'error'],
  [0xff6b6b, 'error'],
  [0xff6347, 'error'],
  [0x8b0000, 'error'],
  [0x721919, 'error'],
  [0x00ff00, 'success'],
  [0x43b581, 'success'],
  [0x2ecc71, 'success'],
  [0x57f287, 'success'],
  [0x51cf66, 'success'],
  [0x008000, 'success'],
  [0xffff00, 'warning'],
  [0xfaa61a, 'warning'],
  [0xfee75c, 'warning'],
  [0xffa500, 'warning'],
  [0xf1c40f, 'warning'],
  [0xf39c12, 'warning'],
  [0xff6600, 'warning'],
  [0xe67e22, 'warning'],
  [0xffd700, 'warning'],
  [0xffd43b, 'warning'],
  [0xa52a2a, 'warning'],
  [0x3498db, 'info'],
  [0x74c0fc, 'info'],
  [0x0099ff, 'info'],
  [0x00ffff, 'info'],
  [0x40e0d0, 'info'],
  [0x5865f2, 'blurple'],
  [0x336699, 'blurple'],
  [0x000080, 'blurple'],
  [0x9b59b6, 'accent'],
  [0xeb459e, 'accent'],
  [0x800080, 'accent'],
  [0xff69b4, 'primary'],
  [0xffc0cb, 'primary'],
  [0x95a5a6, 'gray'],
  [0x808080, 'gray'],
  [0xc0c0c0, 'gray'],
  [0xffffff, 'light'],
  [0xe6e6fa, 'light'],
]);

const THEME_TOKENS = new Set([
  'primary', 'secondary', 'accent', 'surface', 'border',
  'success', 'error', 'warning', 'info',
  'light', 'dark', 'gray', 'muted', 'blurple',
  'green', 'yellow', 'fuchsia', 'red', 'black',
  'economy', 'birthday', 'moderation',
]);

function resolveThemeColor(color) {
  if (typeof color === 'number' && LEGACY_COLORS.has(color)) {
    return getColor(LEGACY_COLORS.get(color));
  }

  if (typeof color === 'string' && THEME_TOKENS.has(color)) {
    return getColor(color);
  }

  return color;
}

const originalSetTitle = EmbedBuilder.prototype.setTitle;
const originalSetAuthor = EmbedBuilder.prototype.setAuthor;
const originalAddFields = EmbedBuilder.prototype.addFields;
const originalSetColor = EmbedBuilder.prototype.setColor;

EmbedBuilder.prototype.setTitle = function setSanitizedTitle(title) {
  return originalSetTitle.call(this, sanitizeEmbedText(title));
};

EmbedBuilder.prototype.setAuthor = function setSanitizedAuthor(author) {
  if (typeof author === 'string') {
    return originalSetAuthor.call(this, sanitizeEmbedText(author));
  }

  if (author && typeof author.name === 'string') {
    return originalSetAuthor.call(this, {
      ...author,
      name: sanitizeEmbedText(author.name),
    });
  }

  return originalSetAuthor.call(this, author);
};

EmbedBuilder.prototype.addFields = function addSanitizedFields(...fields) {
  const normalized = fields.flatMap((field) => (Array.isArray(field) ? field : [field]));
  const sanitized = normalized.map(sanitizeEmbedField);
  return originalAddFields.call(this, sanitized);
};

EmbedBuilder.prototype.setColor = function setThemedColor(color) {
  return originalSetColor.call(this, resolveThemeColor(color));
};

function toFooterPayload(footer) {
  if (typeof footer === 'string') {
    const text = sanitizeEmbedText(footer);
    return text ? { text } : null;
  }

  if (footer && typeof footer.text === 'string') {
    const text = sanitizeEmbedText(footer.text);
    if (!text) return null;
    return {
      ...footer,
      text,
      ...(footer.iconURL ? { iconURL: footer.iconURL } : {}),
    };
  }

  return null;
}

const originalSetDescription = EmbedBuilder.prototype.setDescription;
const originalSetFooter = EmbedBuilder.prototype.setFooter;
const originalSetTimestamp = EmbedBuilder.prototype.setTimestamp;

EmbedBuilder.prototype.setDescription = function(description = '') {
  const descString = sanitizeEmbedText(description || '');
  this[EMBED_BASE_DESCRIPTION_SYMBOL] = descString;
  return originalSetDescription.call(this, descString);
};

EmbedBuilder.prototype.setFooter = function(footer) {
  if (footer === null || footer === undefined) {
    return originalSetFooter.call(this, null);
  }

  const payload = toFooterPayload(footer);
  if (!payload) {
    return this;
  }

  delete this[EMBED_NO_FOOTER_SYMBOL];
  this[EMBED_FOOTER_SYMBOL] = payload.text;
  return originalSetFooter.call(this, payload);
};

EmbedBuilder.prototype.setTimestamp = function(timestamp = new Date()) {
  delete this[EMBED_NO_TIMESTAMP_SYMBOL];
  return originalSetTimestamp.call(this, timestamp);
};

// Final safety net: any embed still built directly with `new EmbedBuilder`
// receives the same Onyx footer and timestamp at send time. Explicit footers
// are preserved untouched.
const originalToJSON = EmbedBuilder.prototype.toJSON;

EmbedBuilder.prototype.toJSON = function onyxSerializedEmbed() {
  if (!this[EMBED_NO_FOOTER_SYMBOL] && !this.data?.footer?.text) {
    try {
      originalSetFooter.call(this, { ...DEFAULT_FOOTER });
    } catch {
      // ignore malformed footers
    }
  }

  if (!this[EMBED_NO_TIMESTAMP_SYMBOL] && !this.data?.timestamp) {
    try {
      originalSetTimestamp.call(this, new Date());
    } catch {
      // ignore malformed timestamps
    }
  }

  return originalToJSON.call(this);
};

export function createEmbed({
  title = '',
  description = '',
  color = 'primary',
  fields = [],
  author = null,
  footer = null,
  thumbnail = null,
  image = null,
  timestamp = true,
  url = null
} = {}) {
  const embed = new EmbedBuilder();

  if (footer === false) {
    embed[EMBED_NO_FOOTER_SYMBOL] = true;
  }

  if (timestamp === false) {
    embed[EMBED_NO_TIMESTAMP_SYMBOL] = true;
  }

  if (title && typeof title === 'string' && title.length > 0) {
    embed.setTitle(title.substring(0, 256));
  }

  if (description && typeof description === 'string' && description.length > 0) {
    embed.setDescription(description.substring(0, 4096));
  }

  try {
    const embedColor = getColor(color) || getColor('primary');
    embed.setColor(embedColor);
  } catch (error) {
    embed.setColor(getColor('primary'));
  }

  if (Array.isArray(fields) && fields.length > 0) {
    const validFields = fields.filter(f => f && f.name && f.value);
    if (validFields.length > 0) {
      embed.addFields(validFields.slice(0, 25)); 
    }
  }

  if (author) {
    try {
      if (typeof author === 'string' && author.length > 0) {
        embed.setAuthor({ name: author.substring(0, 256) });
      } else if (author && typeof author.name === 'string') {
        embed.setAuthor(author);
      }
    } catch (error) {
      
    }
  } else if (botConfig.embeds?.author?.name) {
    embed.setAuthor({
      name: botConfig.embeds.author.name,
      ...(botConfig.embeds.author.icon ? { iconURL: botConfig.embeds.author.icon } : {}),
      ...(botConfig.embeds.author.url ? { url: botConfig.embeds.author.url } : {}),
    });
  }

  if (footer !== false) {
    const footerPayload = footer ?? DEFAULT_FOOTER;
    try {
      if (typeof footerPayload === 'string' && footerPayload.length > 0) {
        embed.setFooter({ text: footerPayload.substring(0, 2048) });
      } else if (footerPayload && typeof footerPayload.text === 'string') {
        embed.setFooter(footerPayload);
      }
    } catch (error) {
      
    }
  }

  if (thumbnail) {
    try {
      if (typeof thumbnail === 'string' && thumbnail.length > 0) {
        embed.setThumbnail(thumbnail);
      } else if (thumbnail && typeof thumbnail.url === 'string') {
        embed.setThumbnail(thumbnail.url);
      }
    } catch (error) {
      
    }
  } else if (botConfig.embeds?.thumbnail) {
    embed.setThumbnail(botConfig.embeds.thumbnail);
  }

  if (image) {
    try {
      if (typeof image === 'string' && image.length > 0) {
        embed.setImage(image);
      } else if (image && typeof image.url === 'string') {
        embed.setImage(image.url);
      }
    } catch (error) {
      
    }
  }

  if (timestamp === true) {
    embed.setTimestamp();
  } else if (timestamp instanceof Date) {
    embed.setTimestamp(timestamp);
  }

  if (url && typeof url === 'string' && url.length > 0) {
    try {
      embed.setURL(url);
    } catch (error) {
      
    }
  }

  return embed;
}

const NOTIFICATION_DEFAULT_TITLES = {
  success: 'Success',
  error: 'Error',
  info: 'Information',
  warning: 'Warning',
  primary: 'Notice',
};

export const USER_ERROR_TITLES = {
  validation: 'Invalid Input',
  permission: 'Permission Denied',
  configuration: 'Configuration Error',
  database: 'Database Error',
  network: 'Network Error',
  discord_api: 'Discord API Error',
  user_input: 'Input Error',
  rate_limit: 'Too Fast',
  unknown: 'Something Went Wrong',
};

const USER_ERROR_COLORS = {
  rate_limit: 'warning',
};

function mentionOrText(value, kind = 'user') {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') {
    if (/^\d{17,20}$/.test(value)) {
      return kind === 'channel' ? `<#${value}>` : kind === 'role' ? `<@&${value}>` : `<@${value}>`;
    }
    return value;
  }
  if (value.id) {
    return kind === 'channel' ? `<#${value.id}>` : kind === 'role' ? `<@&${value.id}>` : `<@${value.id}>`;
  }
  return String(value);
}

/**
 * One-line, chrome-free notice used by commands that only need a quick
 * confirmation (lock/unlock, mute/unmute). No title, fields, footer, or
 * timestamp, so Discord renders a compact box.
 */
export function compactEmbed(description, color = 'primary') {
  return createEmbed({
    description,
    color,
    footer: false,
    timestamp: false,
  });
}

/**
 * Build a clean moderation receipt: target, moderator, optional duration and
 * case id, and the reason. Every moderation command uses the same shape.
 */
export function moderationEmbed({
  action = 'Action Complete',
  target = null,
  moderator = null,
  reason = 'No reason provided',
  duration = null,
  caseId = null,
  color = 'success',
  fields = [],
  description = null,
} = {}) {
  const status = color === 'warning' ? 'warning' : color === 'error' ? 'error' : 'success';
  const embedFields = [
    { name: 'Target', value: mentionOrText(target), inline: true },
    { name: 'Moderator', value: mentionOrText(moderator), inline: true },
  ];

  if (duration) embedFields.push({ name: 'Duration', value: String(duration), inline: true });
  if (caseId) embedFields.push({ name: 'Case ID', value: `#${caseId}`, inline: true });

  embedFields.push({ name: 'Reason', value: String(reason || 'No reason provided'), inline: false });
  embedFields.push(...fields);

  return createEmbed({
    title: statusTitle(status, action),
    description: description || undefined,
    fields: embedFields,
    color,
  });
}

/**
 * Build a consistent user-facing error embed.
 * @param {string} errorType - Error category key (e.g. validation, permission)
 * @param {string} [description] - Specific, actionable message for the user
 * @param {{ titleOverride?: string }} [options]
 */
export function buildUserErrorEmbed(errorType, description = '', options = {}) {
  const type = errorType || 'unknown';
  const title = options.titleOverride || USER_ERROR_TITLES[type] || USER_ERROR_TITLES.unknown;
  const color = USER_ERROR_COLORS[type] || 'error';
  const body = description ? String(description).trim() : undefined;

  return createEmbed({
    title: statusTitle(color === 'warning' ? 'warning' : 'error', title),
    description: body,
    color,
  });
}

function containsDiscordRenderable(content = '') {
  return /<@!?&?\d+>|<#\d+>|\b\d{17,19}\b/.test(String(content));
}

function buildNotificationEmbed(title, body = '', color = 'primary') {
  const defaultTitle = NOTIFICATION_DEFAULT_TITLES[color] || NOTIFICATION_DEFAULT_TITLES.primary;
  let titleText = String(title || '').trim();
  let bodyText = body ? String(body).trim() : '';

  if (titleText && containsDiscordRenderable(titleText)) {
    bodyText = bodyText ? `${titleText}\n\n${bodyText}` : titleText;
    titleText = defaultTitle;
  }

  return createEmbed({
    title: statusTitle(color === 'primary' ? 'sparkle' : color, titleText || defaultTitle),
    description: bodyText || undefined,
    color,
  });
}

/**
 * @deprecated Prefer buildUserErrorEmbed or replyUserError from errorHandler.js.
 */
export function errorEmbed(title, detail = null, options = {}) {
  const { showDetails = process.env.NODE_ENV !== 'production' } = options;
  let body = detail;

  if (detail && showDetails && typeof detail !== 'string') {
    const detailText = detail.message || String(detail);
    body = formatCodeBlock(detailText);
  }

  const description = body ? String(body).trim() : '';
  const titleOverride = title && title !== 'Error' ? title : undefined;

  return buildUserErrorEmbed('unknown', description, { titleOverride });
}

/** @param {string} titleOrBody - With one arg: body text. With two args: title and body. */
export function successEmbed(title, body = '') {
  if (arguments.length === 1) {
    return buildNotificationEmbed('Success', title, 'success');
  }

  return buildNotificationEmbed(title || 'Success', body, 'success');
}

/** @param {string} titleOrBody - With one arg: body text. With two args: title and body. */
export function infoEmbed(title, body = '') {
  if (arguments.length === 1) {
    return buildNotificationEmbed('Information', title, 'info');
  }

  return buildNotificationEmbed(title || 'Information', body, 'info');
}

/** @param {string} titleOrBody - With one arg: body text. With two args: title and body. */
export function warningEmbed(title, body = '') {
  if (arguments.length === 1) {
    return buildNotificationEmbed('Warning', title, 'warning');
  }

  return buildNotificationEmbed(title || 'Warning', body, 'warning');
}

export function formatUser(user) {
  return `${user}`;
}

export function formatDate(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function formatRelativeTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function formatCodeBlock(content, language = '') {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

export function formatInlineCode(content) {
  return `\`${content}\``;
}

export function formatBold(content) {
  return `**${content}**`;
}

export function formatItalic(content) {
  return `*${content}*`;
}

export function formatUnderline(content) {
  return `__${content}__`;
}

export function formatStrikethrough(content) {
  return `~~${content}~~`;
}

export function formatSpoiler(content) {
  return `||${content}||`;
}

export function formatQuote(content) {
  return `> ${content}`;
}

export function formatList(items, ordered = false) {
  return items
    .map((item, index) => (ordered ? `${index + 1}.` : '•') + `${item}`)
    .join('\n');
}

export function formatDuration(ms) {
  if (ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join('');
}

export function formatProgressBar(current, max, size = 10) {
  const progress = Math.min(Math.max(0, current / max), 1);
  const filled = Math.round(size * progress);
  const empty = size - filled;
  return `${'━'.repeat(filled)}${'─'.repeat(empty)} ${Math.round(progress * 100)}%`;
}