// Onyx Discord Bot
// Author: Onyx

import { moderationStore, ids } from '#db/moderationStore';
import { roleHierarchyProblem } from './moderation.js';

const timers = new Map();
const lockBypasses = new Map();
const MAX_TIMEOUT = 2_147_483_647;

const bypassKey = (guildId, roleId, userId) => `${guildId}:${roleId}:${userId}`;

/**
 * Allows one expected role change to bypass a role lock for a short window.
 * @param {string} guildId
 * @param {string} roleId
 * @param {string} userId
 * @param {number} [ttl=15000]
 * @returns {void}
 */
export const bypassRoleLock = (guildId, roleId, userId, ttl = 15_000) => {
        lockBypasses.set(bypassKey(guildId, roleId, userId), Date.now() + ttl);
};

/**
 * Consumes a role-lock bypass for a specific member and role.
 * @param {string} guildId
 * @param {string} roleId
 * @param {string} userId
 * @returns {boolean}
 */
export const consumeRoleLockBypass = (guildId, roleId, userId) => {
        const key = bypassKey(guildId, roleId, userId);
        const expiresAt = lockBypasses.get(key);
        if (!expiresAt) return false;

        lockBypasses.delete(key);
        return expiresAt > Date.now();
};

/**
 * Schedules removal of a temporary role.
 * @param {import('discord.js').Client} client
 * @param {object} record
 */
export const scheduleTempRoleRemoval = (client, record) => {
        const existing = timers.get(record.id);
        if (existing) clearTimeout(existing);

        const delay = Math.max(0, Number(record.expiresAt || 0) - Date.now());

        const run = async () => {
                timers.delete(record.id);

                const current = await moderationStore.get(record.id);
                if (!current) return;

                const remaining = Number(current.expiresAt || 0) - Date.now();
                if (remaining > 1_000) {
                        scheduleTempRoleRemoval(client, current);
                        return;
                }

                await moderationStore.delete(record.id);
                if (current.preExisting) return;

                const guild = client.guilds.cache.get(current.guildId);
                if (!guild) return;

                const member = await guild.members.fetch(current.userId).catch(() => null);
                const role = guild.roles.cache.get(current.roleId);
                if (!member || !role || !member.roles.cache.has(role.id)) return;

                if (
                        roleHierarchyProblem({
                                guild,
                                member,
                                role,
                                moderator: null,
                                botMember: guild.members.cache.get(client.user.id),
                        })
                ) {
                        return;
                }

                bypassRoleLock(current.guildId, current.roleId, current.userId);
                await member.roles.remove(role, `[Onyx] Temporary role expired`).catch(() => {});
        };

        const timer = setTimeout(() => void run(), Math.min(delay, MAX_TIMEOUT));
        timer.unref?.();
        timers.set(record.id, timer);
};

/**
 * Restores temporary-role timers after a restart.
 * @param {import('discord.js').Client} client
 * @returns {Promise<number>}
 */
export const restoreTempRoles = async (client) => {
        const records = await moderationStore.query({ kind: 'temporole' });
        for (const record of records) scheduleTempRoleRemoval(client, record);
        return records.length;
};

/**
 * Applies configured autoroles to a newly joined member.
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<void>}
 */
export const applyAutoroles = async (member) => {
        const config = await moderationStore.get(ids.autorole(member.guild.id));
        if (!Array.isArray(config?.entries) || config.entries.length === 0) return;

        const botMember = member.guild.members.cache.get(member.client.user.id);

        for (const entry of config.entries) {
                const role = member.guild.roles.cache.get(entry.roleId);
                if (!role) continue;

                if (
                        roleHierarchyProblem({
                                guild: member.guild,
                                member,
                                role,
                                moderator: null,
                                botMember,
                        })
                ) {
                        continue;
                }

                const matches =
                        entry.mode === 'everyone' ||
                        (entry.mode === 'bots' && member.user.bot) ||
                        (entry.mode === 'humans' && !member.user.bot);
                if (!matches) continue;

                const apply = async () => {
                        if (entry.action === 'add') {
                                if (!member.roles.cache.has(role.id)) {
                                        bypassRoleLock(member.guild.id, role.id, member.id);
                                        await member.roles.add(role, `[Onyx] Autorole`).catch(() => {});
                                }
                        } else if (member.roles.cache.has(role.id)) {
                                bypassRoleLock(member.guild.id, role.id, member.id);
                                await member.roles.remove(role, `[Onyx] Autorole`).catch(() => {});
                        }
                };

                if (entry.delay > 0) {
                        const timer = setTimeout(
                                () => void apply(),
                                Math.min(entry.delay, MAX_TIMEOUT),
                        );
                        timer.unref?.();
                } else {
                        await apply();
                }
        }
};

/**
 * Reapplies a locked nickname if it was changed.
 * @param {import('discord.js').GuildMember} oldMember
 * @param {import('discord.js').GuildMember} newMember
 * @returns {Promise<void>}
 */
export const enforceNicknameLock = async (oldMember, newMember) => {
        if (oldMember.nickname === newMember.nickname) return;

        const lock = await moderationStore.get(
                ids.nickLock(newMember.guild.id, newMember.id),
        );
        if (!lock || newMember.nickname === lock.nickname) return;

        await newMember
                .setNickname(lock.nickname, `[Onyx] Nickname lock enforced`)
                .catch(() => {});
};

/**
 * Reverts manual changes to locked roles.
 * @param {import('discord.js').GuildMember} oldMember
 * @param {import('discord.js').GuildMember} newMember
 * @returns {Promise<void>}
 */
export const enforceRoleLocks = async (oldMember, newMember) => {
        const before = new Set([...oldMember.roles.cache.keys()]);
        const after = new Set([...newMember.roles.cache.keys()]);
        const changed = [...new Set([...before, ...after])].filter(
                (id) => before.has(id) !== after.has(id),
        );

        for (const roleId of changed) {
                if (consumeRoleLockBypass(newMember.guild.id, roleId, newMember.id)) continue;

                const lock = await moderationStore.get(ids.roleLock(newMember.guild.id, roleId));
                if (!lock) continue;

                if (before.has(roleId) && !after.has(roleId)) {
                        await newMember.roles.add(roleId, `[Onyx] Role lock enforced`).catch(() => {});
                } else if (!before.has(roleId) && after.has(roleId)) {
                        await newMember.roles.remove(roleId, `[Onyx] Role lock enforced`).catch(() => {});
                }
        }
};
