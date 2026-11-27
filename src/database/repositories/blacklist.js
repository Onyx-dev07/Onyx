// Onyx Discord Bot
// Author: Onyx
import { db } from '#dbManager';
import { getClient } from '#classes/clientRegistry';

/** Cache TTL for blacklist entries (10 hours). */
const CACHE_TTL = 36000;
const CACHE_PREFIX = 'blacklist:';
const COLLECTION = 'blacklist';

/**
 * Data-access layer for the `blacklist` collection.
 * Uses a two-level cache: per-ID records and a boolean `exists` flag to avoid
 * unnecessary DB queries in the hot path.
 */
export class BlacklistRepository {
        constructor() {
                this.db = db.db;
        }

        /**
         * Fetches a blacklist entry by ID. Returns the cached record if available.
         * @param {string} id - User or guild ID.
         * @returns {Promise<Object|null>} The entry row, or `null` if not found.
         */
        async findById(id) {
                if (!id) return null;

                const cacheKey = `${CACHE_PREFIX}${id}`;
                const cached = await getClient().c.get(cacheKey);
                if (cached !== null && cached !== undefined) return cached;

                const entry = await this.db.get(COLLECTION, id);

                const result = entry || null;
                if (result) {
                        await getClient().c.set(cacheKey, result, CACHE_TTL);
                }

                return result;
        }

        /**
         * Returns whether an ID is blacklisted. Caches the boolean result separately
         * from the full record to keep the hot-path lookup cheap.
         * @param {string} id
         * @returns {Promise<boolean>}
         */
        async exists(id) {
                if (!id) return false;

                const cacheKey = `${CACHE_PREFIX}exists:${id}`;
                const cached = await getClient().c.get(cacheKey);
                if (cached !== null && cached !== undefined) return cached;

                const entry = await this.findById(id);
                const result = !!entry;

                await getClient().c.set(cacheKey, result, CACHE_TTL);
                return result;
        }

        /**
         * Inserts a new blacklist entry and primes the per-ID and `exists` caches.
         * Also invalidates the all-entries and type list caches.
         * @param {{ id: string, type: string, [key: string]: any }} data
         * @returns {Promise<void>}
         */
        async create(data) {
                if (!data?.id) return;

                await this.db.set(COLLECTION, data);

                await Promise.all([
                        getClient().c.set(`${CACHE_PREFIX}${data.id}`, data, CACHE_TTL),
                        getClient().c.set(`${CACHE_PREFIX}exists:${data.id}`, true, CACHE_TTL),
                        this._invalidateListCaches(data.type),
                ]);
        }

        /**
         * Deletes an entry by ID and clears all caches related to it.
         * Fetches the entry first so the correct type list can be invalidated.
         * @param {string} id
         * @returns {Promise<void>}
         */
        async delete(id) {
                if (!id) return;

                const entry = await this.findById(id);
                await this.db.delete(COLLECTION, id);

                await this._invalidateCaches(id, entry?.type);
        }

        /**
         * Returns all blacklist entries. Cached for 10 minutes.
         * @returns {Promise<Object[]>}
         */
        async findAll() {
                const cacheKey = `${CACHE_PREFIX}all`;
                const cached = await getClient().c.get(cacheKey);
                if (cached !== null && cached !== undefined) return cached;

                const result = await this.db.all(COLLECTION);
                await getClient().c.set(cacheKey, result, 600);

                return result;
        }

        /**
         * Returns all entries matching `type` (e.g. `'user'` or `'guild'`).
         * @param {string} type
         * @returns {Promise<Object[]>}
         */
        async findByType(type) {
                if (!type) return [];

                const cacheKey = `${CACHE_PREFIX}type:${type}`;
                const cached = await getClient().c.get(cacheKey);
                if (cached !== null && cached !== undefined) return cached;

                const all = await this.db.all(COLLECTION);
                const result = all.filter((item) => item.type === type);

                await getClient().c.set(cacheKey, result, CACHE_TTL);
                return result;
        }

        /**
         * Deletes all entries of a given type and clears the entire blacklist cache namespace.
         * @param {string} type
         * @returns {Promise<void>}
         */
        async deleteByType(type) {
                if (!type) return;

                const all = await this.db.all(COLLECTION);
                const remaining = all.filter((item) => item.type !== type);
                await this.db.write(COLLECTION, remaining);

                await this._invalidateTypeCaches(type);
        }

        /**
         * Clears the per-ID record, the `exists` flag, the all-entries list,
         * and the type-scoped list for the given entry.
         * @param {string} id
         * @param {string} [type]
         * @returns {Promise<void>}
         */
        async _invalidateCaches(id, type) {
                const keys = [`${CACHE_PREFIX}${id}`, `${CACHE_PREFIX}exists:${id}`, `${CACHE_PREFIX}all`];

                if (type) {
                        keys.push(`${CACHE_PREFIX}type:${type}`);
                }

                await getClient().c.mdel(keys);
        }

        /**
         * Clears the all-entries list and, optionally, a type-scoped list.
         * Called after inserting a new entry.
         * @param {string} [type]
         * @returns {Promise<void>}
         */
        async _invalidateListCaches(type) {
                const keys = [`${CACHE_PREFIX}all`];
                if (type) {
                        keys.push(`${CACHE_PREFIX}type:${type}`);
                }
                await getClient().c.mdel(keys);
        }

        /**
         * Performs a full namespace flush by scanning for all keys matching the
         * blacklist prefix pattern and bulk-deleting them.
         * Used after a bulk type deletion where individual IDs are unknown.
         * @param {string} type - Unused directly, but signals a broad invalidation is needed.
         * @returns {Promise<void>}
         */
        async _invalidateTypeCaches(type) {
                const pattern = `${CACHE_PREFIX}*`;
                const keys = await getClient().c.keys(pattern);
                await getClient().c.mdel(keys);
        }
}

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */