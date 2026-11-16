import { logger } from '../utils/logger.js';
import { BRAINROT_PHRASES } from '../config/brainrotPhrases.js';

const STORAGE_KEY_PREFIX = 'brainrotlock:';
const lockedUsersByGuild = new Map();
const pendingLoads = new Map();

let lastPhraseIndex = -1;

function storageKey(guildId) {
  return `${STORAGE_KEY_PREFIX}${guildId}`;
}

async function persist(client, guildId, users) {
  if (!client?.db || typeof client.db.set !== 'function') {
    throw new Error('Database unavailable');
  }

  await client.db.set(storageKey(guildId), [...users]);
}

export async function getLockedUsers(client, guildId) {
  if (lockedUsersByGuild.has(guildId)) {
    return lockedUsersByGuild.get(guildId);
  }

  if (pendingLoads.has(guildId)) {
    return pendingLoads.get(guildId);
  }

  const load = (async () => {
    let users = new Set();

    try {
      const stored = await client?.db?.get?.(storageKey(guildId), []);
      if (Array.isArray(stored)) {
        users = new Set(stored.filter(id => typeof id === 'string'));
      }
    } catch (error) {
      logger.error('Failed to load brainrot locks:', { guildId, error });
    }

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
  return users.has(userId);
}

export async function addBrainrotLock(client, guildId, userId) {
  const users = await getLockedUsers(client, guildId);
  if (users.has(userId)) {
    return false;
  }

  users.add(userId);

  try {
    await persist(client, guildId, users);
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
