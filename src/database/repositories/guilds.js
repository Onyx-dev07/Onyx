// Onyx Discord Bot
// Author: Onyx
import { db } from '#dbManager';
import { config } from '#config';
import { getClient } from '#classes/clientRegistry';

/** Cache TTL for individual guild records (5 hours). */
const CACHE_TTL = 18000;
const CACHE_PREFIX = 'guild:';
const COLLECTION = 'guilds';

/**
 * Data-access layer for the `guilds` collection.
 * All reads are cache-first (via the bot's {@link CacheManager}); writes invalidate
 * relevant cache keys after the database operation completes.
 */
export class GuildRepository {
        constructor() {
                this.db = db.db;
        }

        /**
         * Fetches a guild by ID. Returns the cached record if available.
         * @param {string} guildId
         * @returns {Promise<Object|null>} The guild row, or `null` if not found.
         */
        async findById(guildId) {
                if (!guildId) return null;

                const cacheKey = `${CACHE_PREFIX}${guildId}`;
                const cached = await getClient().c.get(cacheKey);
                if (cached !== null && cached !== undefined) return cached;

                const guild = await this.db.get(COLLECTION, guildId);

                const result = guild || null;
                if (result) {
                        await getClient().c.set(cacheKey, result, CACHE_TTL);
                }

                return result;
        }

        /**
         * Returns the guild record, inserting a default row if it doesn't exist yet.
         * The newly created record is cached and all list caches are invalidated.
         * @param {string} guildId
         * @throws {Error} If `guildId` is falsy.
         * @returns {Promise<Object>} Existing or newly created guild row.
         */
        async findOrCreate(guildId) {
                if (!guildId) {
                        throw new Error('Invalid guildId');
                }

                let guild = await this.findById(guildId);

                if (!guild) {
                        const newGuild = {
                                id: guildId,
                                prefixes: [config.prefix],
                                ignoredChannels: [],
                                isCustomProfile: false,
                                avatarUpdatedAt: null,
                                bannerUpdatedAt: null,
                                bioUpdatedAt: null,
                        };

                        await this.db.set(COLLECTION, newGuild);

                        await Promise.all([
                                getClient().c.set(`${CACHE_PREFIX}${guildId}`, newGuild, CACHE_TTL),
                                this._invalidateListCaches(),
                        ]);

                        return newGuild;
                }

                return guild;
        }

        /**
         * Applies a partial update to a guild row. Automatically sets `updatedAt`.
         * Invalidates the guild's cache entry and any related list caches.
         * @param {string} guildId
         * @param {Object} data - Partial guild fields to update.
         * @returns {Promise<void>}
         */
        async update(guildId, data) {
                if (!guildId) return;

                const guild = await this.findById(guildId);
                if (!guild) return;

                const updatedGuild = { ...guild, ...data };
                await this.db.set(COLLECTION, updatedGuild);

                await this._invalidateGuildCaches(guildId, data);
        }

        /**
         * Deletes a guild row and purges its cache entries.
         * @param {string} guildId
         * @returns {Promise<void>}
         */
        async delete(guildId) {
                if (!guildId) return;

                await this.db.delete(COLLECTION, guildId);
                await this._invalidateGuildCaches(guildId, { deleted: true });
        }

        /**
         * Returns all guild rows. Result is cached for 30 minutes.
         * @returns {Promise<Object[]>}
         */
        async findAll() {
                const cacheKey = `${CACHE_PREFIX}all`;
                const cached = await getClient().c.get(cacheKey);
                if (cached !== null && cached !== undefined) return cached;

                const result = await this.db.all(COLLECTION);
                await getClient().c.set(cacheKey, result, 1800);

                return result;
        }

        /**
         * Atomically increments a numeric column on a guild row.
         * @param {string} guildId
         * @param {string} field - Column name to increment.
         * @param {number} [amount=1]
         * @returns {Promise<void>}
         */
        async incrementField(guildId, field, amount = 1) {
                if (!guildId || !field) return;

                const guild = await this.findById(guildId);
                if (!guild) return;

                const currentVal = guild[field] || 0;
                guild[field] = currentVal + amount;

                await this.db.set(COLLECTION, guild);
                await getClient().c.del(`${CACHE_PREFIX}${guildId}`);
        }

        /**
         * Invalidates the per-guild cache key and the all-guilds list.
         * @param {string} guildId
         * @param {Object} [data={}] - The update payload, used to detect which extra keys need clearing.
         * @returns {Promise<void>}
         */
        async _invalidateGuildCaches(guildId, data = {}) {
                const keys = [`${CACHE_PREFIX}${guildId}`, `${CACHE_PREFIX}all`];
                await getClient().c.mdel(keys);
        }

        /**
         * Clears the all-guilds and 24/7-enabled list caches.
         * Called after inserting a new guild.
         * @returns {Promise<void>}
         */
        async _invalidateListCaches() {
                await getClient().c.mdel([`${CACHE_PREFIX}all`, `${CACHE_PREFIX}247:enabled`]);
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