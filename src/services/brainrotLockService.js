import { logger } from '../utils/logger.js';
import { BRAINROT_PHRASES } from '../config/brainrotPhrases.js';
import { getBrainrotLockKey } from '../utils/database/keys.js';

const lockedUsersByGuild = new Map();
const pendingLoads = new Map();

let lastPhraseIndex = -1;

/**
 * Database backends have returned this list as an array, a JSON string and an
 * { ok, value } envelope. Normalize every shape before deciding whether a user
 * is locked, otherwise a successful write can be silently ignored on read.
 */
function unwrapStoredValue(value, depth = 0) {
  if (depth > 6) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;

    try {
      return unwrapStoredValue(JSON.parse(trimmed), depth + 1);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];

  if (value && typeof value === 'object') {
    if ('ok' in value && 'value' in value) {
      return unwrapStoredValue(value.value, depth + 1);
    }
    if ('value' in value) {
      return unwrapStoredValue(value.value, depth + 1);
    }

    for (const field of ['users', 'lockedUsers', 'ids']) {
      if (Array.isArray(value[field])) {
        return value[field];
      }
    }
  }

  return value;
}

function normalizeUserIds(stored) {
  const parsed = unwrapStoredValue(stored);
  if (!Array.isArray(parsed)) {
    return null;
  }

  return new Set(
    parsed
      .map(id => (id === null || id === undefined ? null : String(id)))
      .filter(Boolean),
  );
}

async function persist(client, guildId, users) {
  if (!client?.db || typeof client.db.set !== 'function') {
    throw new Error('Database unavailable');
  }

  const saved = await client.db.set(getBrainrotLockKey(guildId), [...users]);
  if (saved === false) {
    throw new Error('Database rejected the brainrot lock write');
  }

  return true;
}

async function readLockedUsers(client, guildId) {
  try {
    const stored = await client?.db?.get?.(getBrainrotLockKey(guildId), []);
    return normalizeUserIds(stored);
  } catch (error) {
    logger.error('Failed to load brainrot locks:', { guildId, error });
    return null;
  }
}

export async function getLockedUsers(client, guildId) {
  if (lockedUsersByGuild.has(guildId)) {
    return lockedUsersByGuild.get(guildId);
  }

  if (pendingLoads.has(guildId)) {
    return pendingLoads.get(guildId);
  }

  const load = (async () => {
    const stored = await readLockedUsers(client, guildId);
    const users = stored ?? new Set();

    lockedUsersByGuild.set(guildId, users);
    return users;
  })();

  pendingLoads.set(guildId, load);

  try {
    return await load;
  } finally {
    pendingLoads.delete(guildId);
  }
}

export async function isBrainrotLocked(client, guildId, userId) {
  const users = await getLockedUsers(client, guildId);
  if (users.has(userId)) return true;

  // The cache can be stale when a lock was added by another process or before
  // this process started. Re-read storage on a miss before deciding the user is
  // unlocked, and fold any persisted lock back into the cache.
  const stored = await readLockedUsers(client, guildId);
  if (!stored?.has(userId)) return false;

  users.add(userId);
  return true;
}

export async function addBrainrotLock(client, guildId, userId) {
  const users = await getLockedUsers(client, guildId);
  if (users.has(userId)) {
    return false;
  }

  users.add(userId);

  try {
    await persist(client, guildId, users);

    // Do not report success unless the saved value can be read back in the
    // shape the message handler uses.
    const confirmed = await readLockedUsers(client, guildId);
    if (!confirmed?.has(userId)) {
      throw new Error('Brainrot lock was not returned by a read-back check');
    }

    return true;
  } catch (error) {
    users.delete(userId);
    throw error;
  }
}

export async function removeBrainrotLock(client, guildId, userId) {
  const users = await getLockedUsers(client, guildId);
  if (!users.has(userId)) {
    return false;
  }

  users.delete(userId);

  try {
    await persist(client, guildId, users);

    const confirmed = await readLockedUsers(client, guildId);
    if (confirmed?.has(userId)) {
      throw new Error('Brainrot lock removal was not confirmed by a read-back check');
    }

    return true;
  } catch (error) {
    users.add(userId);
    throw error;
  }
}

// Avoid repeating the same phrase back-to-back when possible.
export function pickBrainrotPhrase() {
  if (BRAINROT_PHRASES.length === 0) {
    return 'bro is cooked';
  }

  let index = Math.floor(Math.random() * BRAINROT_PHRASES.length);
  if (BRAINROT_PHRASES.length > 1 && index === lastPhraseIndex) {
    index = (index + 1) % BRAINROT_PHRASES.length;
  }

  lastPhraseIndex = index;
  return BRAINROT_PHRASES[index];
}
