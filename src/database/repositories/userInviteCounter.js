// Onyx Discord Bot
// Author: Onyx
import { db } from '#dbManager';
import { getClient } from '#classes/clientRegistry';

const CACHE_TTL = 15;
const CACHE_PREFIX = 'userinvitecount:';
const COLLECTION = 'user_invite_counts';

/**
 * Data-access layer for the `user_invite_counts` collection.
 * Tracks per-user per-guild all-time invite totals.
 */
export class UserInviteCounterRepository {
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

        async findOrCreate(guildId, userId) {
                if (!guildId || !userId) throw new Error('Invalid guildId or userId');

                let record = await this.findById(guildId, userId);

                if (!record) {
                        record = {
                                id: this._id(guildId, userId),
                                guildId,
                                userId,
                                total: 0,
                                joins: 0,
                                left: 0,
                                fake: 0,
                                rejoins: 0,
                        };

                        await this.db.set(COLLECTION, record);
                        await getClient().c.set(`${CACHE_PREFIX}${record.id}`, record, CACHE_TTL);
                }

                return record;
        }

        async increment(guildId, userId) {
                if (!guildId || !userId) return;

                const record = await this.findOrCreate(guildId, userId);

                const updated = {
                        ...record,
                        total: (record.total || 0) + 1,
                };

                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async findAllByGuild(guildId) {
                if (!guildId) return [];
                const Model = this.db._getModel(COLLECTION);
                const docs = await Model.find({ guildId })
                        .sort({ total: -1 })
                        .lean();
                return docs.map((doc) => this.db._clean(doc));
        }

        async resetCount(guildId, userId) {
                if (!guildId || !userId) return;

                const record = await this.findOrCreate(guildId, userId);

                const updated = {
                        ...record,
                        total: 0,
                };

                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async addCount(guildId, userId, amount) {
                if (!guildId || !userId || !amount || amount < 1) return;

                const record = await this.findOrCreate(guildId, userId);

                const updated = {
                        ...record,
                        total: (record.total || 0) + amount,
                };

                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async removeCount(guildId, userId, amount) {
                if (!guildId || !userId || !amount || amount < 1) return;

                const record = await this.findOrCreate(guildId, userId);

                const updated = {
                        ...record,
                        total: Math.max(0, (record.total || 0) - amount),
                };

                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        _calcTotal(record) {
                return Math.max(0, (record.joins || 0) - (record.left || 0) - (record.fake || 0));
        }

        async incrementJoins(guildId, userId) {
                if (!guildId || !userId) return;
                const record = await this.findOrCreate(guildId, userId);
                const updated = { ...record, joins: (record.joins || 0) + 1 };
                updated.total = this._calcTotal(updated);
                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async incrementLeft(guildId, userId) {
                if (!guildId || !userId) return;
                const record = await this.findOrCreate(guildId, userId);
                const updated = { ...record, left: (record.left || 0) + 1 };
                updated.total = this._calcTotal(updated);
                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async incrementFake(guildId, userId) {
                if (!guildId || !userId) return;
                const record = await this.findOrCreate(guildId, userId);
                const updated = { ...record, fake: (record.fake || 0) + 1 };
                updated.total = this._calcTotal(updated);
                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async incrementRejoins(guildId, userId) {
                if (!guildId || !userId) return;
                const record = await this.findOrCreate(guildId, userId);
                const updated = { ...record, rejoins: (record.rejoins || 0) + 1 };
                updated.total = this._calcTotal(updated);
                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async resetAll(guildId, userId) {
                if (!guildId || !userId) return;

                const record = await this.findOrCreate(guildId, userId);

                const updated = {
                        ...record,
                        total: 0,
                        joins: 0,
                        left: 0,
                        fake: 0,
                        rejoins: 0,
                };

                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async addFakeCount(guildId, userId, amount) {
                if (!guildId || !userId || !amount || amount < 1) return;
                const record = await this.findOrCreate(guildId, userId);
                const updated = { ...record, fake: (record.fake || 0) + amount };
                updated.total = this._calcTotal(updated);
                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async removeFakeCount(guildId, userId, amount) {
                if (!guildId || !userId || !amount || amount < 1) return;
                const record = await this.findOrCreate(guildId, userId);
                const updated = { ...record, fake: Math.max(0, (record.fake || 0) - amount) };
                updated.total = this._calcTotal(updated);
                await this.db.set(COLLECTION, updated);
                await getClient().c.set(`${CACHE_PREFIX}${record.id}`, updated, CACHE_TTL);
        }

        async getCount(guildId, userId) {
                const record = await this.findOrCreate(guildId, userId);
                return {
                        total: record.total || 0,
                        joins: record.joins || 0,
                        left: record.left || 0,
                        fake: record.fake || 0,
                        rejoins: record.rejoins || 0,
                };
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