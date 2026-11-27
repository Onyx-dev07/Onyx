// Onyx Discord Bot
// Author: Onyx

import { db } from '#dbManager';

const COLLECTION = 'moderation_extras';

/**
 * Small document store for nickname/role management settings.
 * Records always include `kind` and `guildId` so they work with both the
 * MongoDB and JSON database backends.
 */
export const moderationStore = {
        /**
         * @param {string} id
         * @returns {Promise<object|null>}
         */
        async get(id) {
                return await db.db.get(COLLECTION, id);
        },

        /**
         * @param {string} id
         * @param {object} data
         * @returns {Promise<void>}
         */
        async set(id, data) {
                await db.db.set(COLLECTION, { ...data, id });
        },

        /**
         * @param {string} id
         * @returns {Promise<void>}
         */
        async delete(id) {
                await db.db.delete(COLLECTION, id);
        },

        /**
         * @param {string} guildId
         * @param {string} kind
         * @returns {Promise<object[]>}
         */
        async byKind(guildId, kind) {
                const rows = await db.db.query(COLLECTION, { guildId });
                return rows.filter((row) => row.kind === kind);
        },

        /**
         * @param {object} filter
         * @returns {Promise<object[]>}
         */
        async query(filter) {
                return await db.db.query(COLLECTION, filter);
        },
};

export const ids = {
        nickLock: (guildId, userId) => `nicklock:${guildId}:${userId}`,
        nickConfig: (guildId) => `nickconfig:${guildId}`,
        roleLock: (guildId, roleId) => `rolelock:${guildId}:${roleId}`,
        roleLimit: (guildId, roleId) => `rolelimit:${guildId}:${roleId}`,
        autorole: (guildId) => `autorole:${guildId}`,
        massJob: (guildId) => `massjob:${guildId}`,
        tempRole: (guildId, userId, roleId) => `temporole:${guildId}:${userId}:${roleId}`,
        createdRole: (guildId, roleId) => `createdrole:${guildId}:${roleId}`,
};

/**
 * Records a role action in the paginated history log.
 * @param {object} entry
 * @returns {Promise<void>}
 */
export const recordRoleHistory = async (entry) => {
        const now = Date.now();
        const id = `rolehistory:${entry.guildId}:${entry.userId}:${now}:${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        await moderationStore.set(id, {
                kind: 'rolehistory',
                guildId: entry.guildId,
                userId: entry.userId,
                action: entry.action,
                roleId: entry.roleId ?? null,
                roleName: entry.roleName ?? null,
                moderatorId: entry.moderatorId ?? null,
                reason: entry.reason ?? '',
                at: now,
        });
};
