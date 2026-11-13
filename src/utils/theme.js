// theme.js — central visual identity for every Onyx surface.
//
// Discord embeds cannot render rounded corners or real borders, so the premium
// look is built from a near-black surface color, a soft pink accent stripe,
// compact typography, and restrained status emoji.

import { botConfig, getColor } from '../config/bot.js';

export const EMOJI = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',
  sparkle: '✨',
  heart: '🩷',
  dot: '•',
  arrow: '→',
  check: '✔️',
  cross: '✖️',
  online: '🟢',
  idle: '🌙',
  dnd: '🔴',
  offline: '⚫',
  crown: '👑',
  bolt: '⚡',
  shield: '🛡️',
  lock: '🔒',
  unlock: '🔓',
  trash: '🗑️',
  clock: '🕒',
  pin: '📌',
  user: '👤',
  users: '👥',
  channel: '💬',
  role: '🎭',
  bot: '🤖',
  server: '🌐',
  chart: '📊',
  trophy: '🏆',
  gift: '🎁',
  coin: '🪙',
  star: '⭐',
  target: '🎯',
  wave: '👋',
  party: '🎉',
  search: '🔎',
  tools: '🛠️',
  gear: '⚙️',
  ticket: '🎫',
  game: '🎮',
  calendar: '🎂',
  sound: '🔊',
  verify: '✅',
  log: '📋',
};

export const CATEGORY_EMOJI = {
  birthday: EMOJI.calendar,
  community: EMOJI.users,
  core: EMOJI.gear,
  economy: EMOJI.coin,
  fun: EMOJI.game,
  giveaway: EMOJI.gift,
  jointocreate: EMOJI.sound,
  leveling: EMOJI.chart,
  logging: EMOJI.log,
  moderation: EMOJI.shield,
  onyx: EMOJI.lock,
  reactionroles: EMOJI.role,
  search: EMOJI.search,
  serverstats: EMOJI.chart,
  ticket: EMOJI.ticket,
  tools: EMOJI.tools,
  utility: EMOJI.tools,
  verification: EMOJI.verify,
  welcome: EMOJI.wave,
};

/** Resolve a semantic palette token to a Discord color number. */
export function themeColor(token = 'primary') {
  return getColor(token);
}

/** Look up the emoji used for a command category, with a safe fallback. */
export function categoryEmoji(category) {
  const key = String(category || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  return CATEGORY_EMOJI[key] || EMOJI.sparkle;
}

/** Prefix a title with a status emoji unless it already starts with one. */
export function statusTitle(kind, label) {
  const emoji = EMOJI[kind] || '';
  const text = String(label || '').trim();
  if (!emoji) return text;

  // Avoid doubling up when the caller already supplied an emoji.
  if (/^\p{Extended_Pictographic}/u.test(text)) {
    return text;
  }

  return text ? `${emoji} ${text}` : emoji;
}

/**
 * Text progress bar. Discord cannot color text, so callers pair this with a
 * pink embed color (the `primary` token) for the accent effect.
 */
export function progressBar(percent, length = 10) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round((clamped / 100) * length);
  return `${'━'.repeat(filled)}${'─'.repeat(length - filled)}`;
}

/** Progress bar plus a percentage label, e.g. `━━━━━━──── 60%`. */
export function progressLabel(percent, length = 10) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  return `${progressBar(clamped, length)} **${clamped}%**`;
}

export function userMention(userOrId) {
  if (userOrId == null) return '';
  if (typeof userOrId === 'string') return `<@${userOrId}>`;
  if (userOrId.id) return `<@${userOrId.id}>`;
  return String(userOrId);
}

export function channelMention(channelOrId) {
  if (channelOrId == null) return '';
  if (typeof channelOrId === 'string') return `<#${channelOrId}>`;
  if (channelOrId.id) return `<#${channelOrId.id}>`;
  return String(channelOrId);
}

export function roleMention(roleOrId) {
  if (roleOrId == null) return '';
  if (typeof roleOrId === 'string') return `<@&${roleOrId}>`;
  if (roleOrId.id) return `<@&${roleOrId.id}>`;
  return String(roleOrId);
}

export function avatarURL(user, size = 256) {
  try {
    return user?.displayAvatarURL?.({ size, extension: 'png', forceStatic: true }) || null;
  } catch {
    return null;
  }
}

/** Default footer metadata shared by every embed builder. */
export const DEFAULT_FOOTER = {
  text: botConfig.embeds?.footer?.text || 'Onyx',
  ...(botConfig.embeds?.footer?.icon ? { iconURL: botConfig.embeds.footer.icon } : {}),
};

export default {
  EMOJI,
  CATEGORY_EMOJI,
  DEFAULT_FOOTER,
  themeColor,
  categoryEmoji,
  statusTitle,
  progressBar,
  progressLabel,
  userMention,
  channelMention,
  roleMention,
  avatarURL,
};
