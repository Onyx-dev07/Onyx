// Onyx Discord Bot
// Author: Onyx
import { db } from '#dbManager';
import { getClient } from '#classes/clientRegistry';

const CACHE_TTL = 60;
const CACHE_PREFIX = 'memberinviter:';
const COLLECTION = 'member_inviters';

/**
 * Data-access layer for the `member_inviters` collection.
 * Tracks which user invited which member to a guild.
 */
export class MemberInviterRepository {
        constructor() {
                this.db = db.db;
        }

        _id(guildId, userId) {
                return `${guildId}:${userId}`;
        }

        async findById(guildId, userId) {
                if (!guildId || !userId) return null;

                const cacheKey = `${CACHE_PREFIX}${this._id(guildId, userId)}`;
                const cached = await getClient().c.get(cacheKey);
                if (cached !== null && cached !== undefined) return cached;

                const record = await this.db.get(COLLECTION, this._id(guildId, userId));
                const result = record || null;

                if (result) {
                        await getClient().c.set(cacheKey, result, CACHE_TTL);
                }

                return result;
        }

        async set(guildId, userId, inviterId, joinedAt) {
                if (!guildId || !userId) return;

                const record = {
                        id: this._id(guildId, userId),
                        guildId,
                        userId,
                        inviterId: inviterId || null,
                        joinedAt: joinedAt || Date.now(),
                };

                await this.db.set(COLLECTION, record);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, record, CACHE_TTL);
        }

        async findAllByInviter(guildId, inviterId) {
                if (!guildId || !inviterId) return [];
                return await this.db.query(COLLECTION, { guildId, inviterId });
        }

        async delete(guildId, userId) {
                if (!guildId || !userId) return;
                await this.db.delete(COLLECTION, this._id(guildId, userId));
                await getClient().c.del(`${CACHE_PREFIX}${this._id(guildId, userId)}`);
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