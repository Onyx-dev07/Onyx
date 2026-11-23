const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('../../config.json');

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'emojiConfig.json');

const DEFAULT_CONFIG = {
  sourceGuildId: null,
  sourceGuildName: null,
  syncedAt: null,
  emojis: {},
  slots: {},
};

// Exact names in the dedicated emoji server. `!cx add` uses these to wire up
// every bot marker in one step, so no manual `!cx set` calls are needed.
const AUTO_SLOT_EMOJIS = Object.freeze({
  roleAdd: 'Blue_Plus_Icon',
  roleRemove: 'Blue_Minus_Icon',
  tick: 'Green_Checkmark',
  cross: 'Red_Cross',
});

function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    sourceGuildId: source.sourceGuildId ?? null,
    sourceGuildName: source.sourceGuildName ?? null,
    syncedAt: source.syncedAt ?? null,
    emojis: source.emojis && typeof source.emojis === 'object' ? { ...source.emojis } : {},
    slots: source.slots && typeof source.slots === 'object' ? { ...source.slots } : {},
  };
}

function getEmojiConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG, emojis: {}, slots: {} };
    return normalizeConfig(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')));
  } catch (error) {
    logger.warn('Could not read emoji config; using defaults:', error.message);
    return { ...DEFAULT_CONFIG, emojis: {}, slots: {} };
  }
}

function saveEmojiConfig(value) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tempFile = `${CONFIG_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(normalizeConfig(value), null, 2), 'utf8');
    fs.renameSync(tempFile, CONFIG_FILE);
    return true;
  } catch (error) {
    logger.error('Failed to save emoji config:', error);
    return false;
  }
}

function isEmojiToken(value) {
  return typeof value === 'string' && /^<a?:\w{2,}:\d{17,20}>$/.test(value);
}

/**
 * Match the known emoji names in a synced registry to their bot slots. Returns
 * only the slots that were found, so callers decide when to persist them:
 * `!cx add` auto-maps, while a plain re-sync leaves manual mappings alone.
 */
function autoMapSlots(registry, options = {}) {
  const only = options.slots ? new Set(options.slots) : null;
  const mapped = {};

  for (const [slot, name] of Object.entries(AUTO_SLOT_EMOJIS)) {
    if (only && !only.has(slot)) continue;
    if (!Object.prototype.hasOwnProperty.call(registry, name)) continue;
    mapped[slot] = name;
  }

  return mapped;
}

/**
 * Resolve a named slot to a usable emoji string.
 *
 * Order: editable data/emojiConfig.json slot -> synced emoji registry ->
 * src/config.json emojis map -> caller fallback. A slot may hold either an
 * emoji name ("purpleplus") or a raw token ("<:purpleplus:123...>").
 */
function resolveEmoji(slot, fallback = '') {
  const stored = getEmojiConfig();
  const slotValue = stored.slots?.[slot];

  if (isEmojiToken(slotValue)) return slotValue;
  if (typeof slotValue === 'string' && stored.emojis?.[slotValue]) {
    return stored.emojis[slotValue];
  }

  // `tick` and `cross` also honour the older `check`/`cross` config keys so
  // existing emoji maps keep working before `!cx set` is run.
  const alias = { tick: 'check', success: 'check', error: 'cross' }[slot];
  const configured = config.emojis?.[slot] || (alias ? config.emojis?.[alias] : null);
  if (typeof configured === 'string' && configured) return configured;

  return fallback;
}

function setSlot(slot, value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { error: 'Provide an emoji name or a raw `<:name:id>` token.' };

  const stored = getEmojiConfig();
  if (!isEmojiToken(trimmed) && !stored.emojis[trimmed]) {
    const known = Object.keys(stored.emojis);
    return {
      error: known.length
        ? `Unknown emoji \`${trimmed}\`. Use one from \`!cx list\`, or paste a raw \`<:name:id>\` token.`
        : 'No emojis are synced yet. Run `!cx add <server id>` first, or paste a raw `<:name:id>` token.',
    };
  }

  stored.slots[slot] = trimmed;
  if (!saveEmojiConfig(stored)) return { error: 'Could not write the emoji config file.' };

  return { value: trimmed, resolved: resolveEmoji(slot, '') };
}

async function syncFromGuild(client, guildId, options = {}) {
  const id = String(guildId ?? '').trim();
  if (!/^\d{17,20}$/.test(id)) {
    return { error: 'That does not look like a server ID (17–20 digits).' };
  }

  const guild = client.guilds.cache.get(id) ||
    await client.guilds.fetch(id).catch(() => null);

  if (!guild) {
    return {
      error: `I'm not in a server with ID \`${id}\`. Invite me there first — a bot cannot join a server from its ID alone.`,
    };
  }

  let emojis = guild.emojis.cache;
  try {
    emojis = await guild.emojis.fetch();
  } catch (error) {
    logger.warn(`Could not fetch emojis from ${guild.name}; using cache:`, error.message);
  }

  const registry = {};
  for (const emoji of emojis.values()) {
    registry[emoji.name] = emoji.toString();
  }

  if (Object.keys(registry).length === 0) {
    return { error: `I can see **${guild.name}**, but it has no custom emojis yet.` };
  }

  const stored = getEmojiConfig();
  stored.sourceGuildId = guild.id;
  stored.sourceGuildName = guild.name;
  stored.syncedAt = new Date().toISOString();
  stored.emojis = registry;

  // `add` opts in to auto-mapping; a plain `sync` only refreshes the registry
  // and preserves whatever the owner mapped by hand.
  const mappedSlots = options.autoMap ? autoMapSlots(registry, options) : {};
  Object.assign(stored.slots, mappedSlots);

  if (!saveEmojiConfig(stored)) return { error: 'Could not write the emoji config file.' };

  return { guild, count: Object.keys(registry).length, emojis: registry, mappedSlots };
}

function clearConfig() {
  if (!saveEmojiConfig({ ...DEFAULT_CONFIG, emojis: {}, slots: {} })) {
    return { error: 'Could not write the emoji config file.' };
  }
  return { ok: true };
}

module.exports = {
  CONFIG_FILE,
  AUTO_SLOT_EMOJIS,
  getEmojiConfig,
  saveEmojiConfig,
  resolveEmoji,
  setSlot,
  autoMapSlots,
  syncFromGuild,
  clearConfig,
  isEmojiToken,
};
