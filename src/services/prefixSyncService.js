// prefixSyncService.js — keeps the native guild config and the legacy Onyx
// guild store on the same prefix. Historically /setprefix updated only the
// native config while Onyx help/usage helpers read data/guilds.json, which made
// a changed prefix look like it had reset.

import { createRequire } from 'module';
import { logger } from '../utils/logger.js';
import { getGuildConfigKey } from '../utils/database/keys.js';
import { unwrapReplitData } from '../utils/database/guildConfigStorage.js';
import { updateGuildConfig } from './config/guildConfig.js';

const require = createRequire(import.meta.url);
const onyxDb = require('../onyx/database');

function explicitPrefix(rawConfig) {
  const config = unwrapReplitData(rawConfig);
  if (!config || typeof config !== 'object') return null;

  const prefix = config.prefix;
  return typeof prefix === 'string' && prefix.trim() ? prefix.trim() : null;
}

export function syncPrefixToOnyx(guildId, prefix) {
  if (!guildId || typeof prefix !== 'string' || !prefix.trim()) {
    return false;
  }

  try {
    onyxDb.setPrefix(String(guildId), prefix.trim());
    return true;
  } catch (error) {
    logger.warn('Could not mirror prefix into the Onyx guild store:', {
      guildId: String(guildId),
      error: error.message,
    });
    return false;
  }
}

export async function syncPrefixesOnStartup(client) {
  if (!client?.db || typeof client.db.get !== 'function') {
    return { syncedToOnyx: 0, syncedToNative: 0 };
  }

  const guildIds = new Set([
    ...(client.guilds?.cache?.keys?.() ?? []),
    ...(onyxDb.listGuildIds?.() ?? []),
  ]);

  try {
    const keys = await client.db.list?.('guild:') ?? [];
    for (const key of keys) {
      const match = typeof key === 'string' && key.match(/^guild:([^:]+):config$/);
      if (match) guildIds.add(match[1]);
    }
  } catch (error) {
    logger.debug('Could not list guild config keys for prefix sync:', error.message);
  }

  let syncedToOnyx = 0;
  let syncedToNative = 0;

  for (const guildId of guildIds) {
    try {
      const rawNative = await client.db.get(getGuildConfigKey(guildId), null);
      const nativePrefix = explicitPrefix(rawNative);
      const legacyPrefix = onyxDb.getGuild(guildId)?.prefix;

      // The native config is the live source of truth for /setprefix, so it
      // wins whenever both stores contain an explicit prefix.
      if (nativePrefix) {
        if (legacyPrefix !== nativePrefix && syncPrefixToOnyx(guildId, nativePrefix)) {
          syncedToOnyx += 1;
        }
        continue;
      }

      if (legacyPrefix) {
        await updateGuildConfig(client, guildId, { prefix: legacyPrefix }, {
          command: 'prefix-sync',
        });
        syncedToNative += 1;
      }
    } catch (error) {
      logger.warn('Could not sync prefix for guild:', {
        guildId: String(guildId),
        error: error.message,
      });
    }
  }

  if (syncedToOnyx || syncedToNative) {
    logger.info('Prefix sync complete', { syncedToOnyx, syncedToNative });
  }

  return { syncedToOnyx, syncedToNative };
}
