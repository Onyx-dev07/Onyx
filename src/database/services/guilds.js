// Onyx Discord Bot
// Author: Onyx
import { GuildRepository } from '#dbRepo/guilds';
import { config } from '#config';
import { logger } from '#utils';

/**
 * Business-logic layer for guild settings.
 * Delegates persistence to {@link GuildRepository} and ensures guilds
 * exist before any read/write via {@link ensureGuild}.
 */
export class GuildService {
        constructor() {
                this.repo = new GuildRepository();
        }

        /**
         * Returns the guild record, or `null` if it doesn't exist.
         * @param {string} guildId
         * @returns {Promise<Object|null>}
         */
        async getGuild(guildId) {
                return await this.repo.findById(guildId);
        }

        /**
         * Returns the guild record, creating a default one if absent.
         * @param {string} guildId
         * @returns {Promise<Object>}
         */
        async ensureGuild(guildId) {
                return await this.repo.findOrCreate(guildId);
        }

        /**
         * Returns the guild's command prefixes. Falls back to the global default if none are set.
         * @param {string} guildId
         * @returns {Promise<string[]>}
         */
        async getPrefixes(guildId) {
                const guild = await this.ensureGuild(guildId);
                return Array.isArray(guild.prefixes) && guild.prefixes.length > 0
                        ? guild.prefixes
                        : [config.prefix];
        }

        /**
         * Replaces the guild's prefix list.
         * @param {string} guildId
         * @param {string[]} prefixes
         * @returns {Promise<void>}
         */
        async setPrefixes(guildId, prefixes) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { prefixes });
        }

        /**
         * Returns the list of channel IDs where commands are ignored.
         * @param {string} guildId
         * @returns {Promise<string[]>}
         */
        async getIgnoredChannels(guildId) {
                const guild = await this.ensureGuild(guildId);
                return Array.isArray(guild.ignoredChannels) ? guild.ignoredChannels : [];
        }

        /**
         * Replaces the guild's ignored-channels list.
         * @param {string} guildId
         * @param {string[]} channels
         * @returns {Promise<void>}
         */
        async setIgnoredChannels(guildId, channels) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { ignoredChannels: channels });
        }

        /**
         * @param {string} guildId
         * @param {string} channelId
         * @returns {Promise<boolean>} `true` if commands in this channel should be ignored.
         */
        async isChannelIgnored(guildId, channelId) {
                const ignored = await this.getIgnoredChannels(guildId);
                return ignored.includes(channelId);
        }

        /**
         * Returns all guild rows from the database.
         * @returns {Promise<Object[]>}
         */
        async getAllGuilds() {
                return await this.repo.findAll();
        }

        /**
         * Applies a partial settings update, silently ignoring unrecognised keys.
         * @param {string} guildId
         * @param {Object} settings - May include `prefixes` and/or `ignoredChannels`.
         * @returns {Promise<number>} Number of fields actually updated.
         */
        async updateSettings(guildId, settings) {
                await this.ensureGuild(guildId);

                const allowedKeys = ['prefixes', 'ignoredChannels'];
                const updates = {};

                for (const key of allowedKeys) {
                        if (settings[key] === undefined) continue;
                        updates[key] = settings[key];
                }

                if (Object.keys(updates).length === 0) return 0;

                await this.repo.update(guildId, updates);
                return Object.keys(updates).length;
        }

        /**
         * @param {string} guildId
         * @returns {Promise<Date|null>} Timestamp of the last avatar update, or `null`.
         */
        async getAvatarUpdatedAt(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.avatarUpdatedAt;
        }

        /**
         * Stamps `avatarUpdatedAt` with the current time.
         * @param {string} guildId
         * @returns {Promise<true>}
         */
        async setAvatarUpdatedAt(guildId) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { avatarUpdatedAt: new Date() });
                return true;
        }

        /**
         * @param {string} guildId
         * @returns {Promise<Date|null>}
         */
        async getBannerUpdatedAt(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.bannerUpdatedAt;
        }

        /**
         * Stamps `bannerUpdatedAt` with the current time.
         * @param {string} guildId
         * @returns {Promise<true>}
         */
        async setBannerUpdatedAt(guildId) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { bannerUpdatedAt: new Date() });
                return true;
        }

        /**
         * @param {string} guildId
         * @returns {Promise<Date|null>}
         */
        async getBioUpdatedAt(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.bioUpdatedAt;
        }

        /**
         * Stamps `bioUpdatedAt` with the current time.
         * @param {string} guildId
         * @returns {Promise<true>}
         */
        async setBioUpdatedAt(guildId) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { bioUpdatedAt: new Date() });
                return true;
        }

        /**
         * @param {string} guildId
         * @returns {Promise<boolean>} `true` if the guild is using a custom profile.
         */
        async getCustomProfileStatus(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.isCustomProfile;
        }

        /**
         * @param {string} guildId
         * @param {boolean} status
         * @returns {Promise<void>}
         */
        async setCustomProfileStatus(guildId, status) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { isCustomProfile: status });
        }

        /**
         * Returns the list of channel IDs blacklisted from message counting.
         * @param {string} guildId
         * @returns {Promise<string[]>}
         */
        async getMessageBlacklistedChannels(guildId) {
                const guild = await this.ensureGuild(guildId);
                return Array.isArray(guild.messageBlacklistedChannels) ? guild.messageBlacklistedChannels : [];
        }

        /**
         * Adds a channel to the message counting blacklist.
         * @param {string} guildId
         * @param {string} channelId
         * @returns {Promise<boolean>} `false` if the channel was already blacklisted.
         */
        async addMessageBlacklistedChannel(guildId, channelId) {
                const list = await this.getMessageBlacklistedChannels(guildId);
                if (list.includes(channelId)) return false;
                await this.repo.update(guildId, { messageBlacklistedChannels: [...list, channelId] });
                return true;
        }

        /**
         * Removes a channel from the message counting blacklist.
         * @param {string} guildId
         * @param {string} channelId
         * @returns {Promise<boolean>} `false` if the channel was not blacklisted.
         */
        async removeMessageBlacklistedChannel(guildId, channelId) {
                const list = await this.getMessageBlacklistedChannels(guildId);
                if (!list.includes(channelId)) return false;
                await this.repo.update(guildId, { messageBlacklistedChannels: list.filter((id) => id !== channelId) });
                return true;
        }

        /**
         * Returns `true` if the channel is blacklisted from message counting.
         * @param {string} guildId
         * @param {string} channelId
         * @returns {Promise<boolean>}
         */
        async isMessageChannelBlacklisted(guildId, channelId) {
                const list = await this.getMessageBlacklistedChannels(guildId);
                return list.includes(channelId);
        }

        /**
         * Returns the configured join (welcome) channel ID for a guild.
         * @param {string} guildId
         * @returns {Promise<string|null>}
         */
        async getJoinChannel(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.joinChannelId ?? null;
        }

        /**
         * Saves the join channel ID for a guild.
         * @param {string} guildId
         * @param {string} channelId
         * @returns {Promise<void>}
         */
        async setJoinChannel(guildId, channelId) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { joinChannelId: channelId });
        }

        /**
         * Returns the configured greet channel ID for a guild.
         * @param {string} guildId
         * @returns {Promise<string|null>}
         */
        async getGreetChannel(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.greetChannelId ?? null;
        }

        /**
         * Saves the greet channel ID for a guild.
         * @param {string} guildId
         * @param {string|null} channelId
         */
        async setGreetChannel(guildId, channelId) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { greetChannelId: channelId });
        }

        /**
         * Returns all greet configs for a guild (up to 3).
         * @param {string} guildId
         * @returns {Promise<Array>}
         */
        async getGreetConfigs(guildId) {
                const guild = await this.ensureGuild(guildId);
                return Array.isArray(guild.greetConfigs) ? guild.greetConfigs : [];
        }

        /**
         * Adds a greet config (max 3). Returns false if limit reached.
         * @param {string} guildId
         * @param {Object} config
         * @returns {Promise<boolean>}
         */
        async addGreetConfig(guildId, config) {
                const configs = await this.getGreetConfigs(guildId);
                if (configs.length >= 3) return false;
                configs.push(config);
                await this.repo.update(guildId, { greetConfigs: configs });
                return true;
        }

        /**
         * Removes the greet config for a specific channel. Returns false if not found.
         * @param {string} guildId
         * @param {string} channelId
         * @returns {Promise<boolean>}
         */
        async removeGreetConfigByChannel(guildId, channelId) {
                const configs = await this.getGreetConfigs(guildId);
                const next = configs.filter((c) => c.channelId !== channelId);
                if (next.length === configs.length) return false;
                await this.repo.update(guildId, { greetConfigs: next });
                return true;
        }

        /**
         * Clears all greet configs for a guild.
         * @param {string} guildId
         * @returns {Promise<void>}
         */
        async clearGreetConfigs(guildId) {
                await this.repo.update(guildId, { greetConfigs: [] });
        }

        /**
         * Reads the in-progress setup temp fields from the guild document.
         * @param {string} guildId
         * @returns {Promise<Object|null>}
         */
        async getGreetConfig(guildId) {
                const guild = await this.ensureGuild(guildId);
                if (!guild.greetChannelId) return null;
                return {
                        channelId: guild.greetChannelId ?? null,
                        type: guild.greetType ?? null,
                        message: guild.greetMessage ?? null,
                        title: guild.greetTitle ?? null,
                        description: guild.greetDescription ?? null,
                        color: guild.greetColor ?? null,
                        thumbnailUrl: guild.greetThumbnailUrl ?? null,
                        imageUrl: guild.greetImageUrl ?? null,
                        deleteAfter: guild.greetDeleteAfter ?? null,
                };
        }

        /**
         * Updates in-progress setup temp fields in the guild document.
         * @param {string} guildId
         * @param {Object} data
         * @returns {Promise<void>}
         */
        async setGreetConfig(guildId, data) {
                await this.ensureGuild(guildId);
                const fieldMap = {
                        greetChannelId: data.greetChannelId,
                        greetType: data.greetType,
                        greetMessage: data.greetMessage,
                        greetTitle: data.greetTitle,
                        greetDescription: data.greetDescription,
                        greetColor: data.greetColor,
                        greetThumbnailUrl: data.greetThumbnailUrl,
                        greetImageUrl: data.greetImageUrl,
                        greetDeleteAfter: data.greetDeleteAfter,
                };
                const update = {};
                for (const [k, v] of Object.entries(fieldMap)) {
                        if (v !== undefined) update[k] = v;
                }
                if (Object.keys(update).length) await this.repo.update(guildId, update);
        }

        /**
         * Moves the in-progress setup temp fields into the greetConfigs array (max 3).
         * If the channel already has a config, it is replaced.
         * Returns the finalized config object, or false if the limit is reached.
         * @param {string} guildId
         * @returns {Promise<Object|false>}
         */
        async finalizeGreetConfig(guildId) {
                const guild = await this.ensureGuild(guildId);
                const { greetChannelId, greetType, greetMessage, greetTitle, greetDescription, greetColor, greetThumbnailUrl, greetImageUrl, greetDeleteAfter } = guild;
                if (!greetChannelId) return false;

                const configs = Array.isArray(guild.greetConfigs) ? [...guild.greetConfigs] : [];
                const existingIdx = configs.findIndex((c) => c.channelId === greetChannelId);

                if (existingIdx === -1 && configs.length >= 3) return false;

                const newConfig = {
                        channelId: greetChannelId,
                        type: greetType ?? 'simple',
                        message: greetMessage ?? null,
                        title: greetTitle ?? null,
                        description: greetDescription ?? null,
                        color: greetColor ?? null,
                        thumbnailUrl: greetThumbnailUrl ?? null,
                        imageUrl: greetImageUrl ?? null,
                        deleteAfter: greetDeleteAfter ?? null,
                };

                if (existingIdx >= 0) {
                        configs[existingIdx] = newConfig;
                } else {
                        configs.push(newConfig);
                }

                await this.repo.update(guildId, {
                        greetConfigs: configs,
                        greetChannelId: null,
                        greetType: null,
                        greetMessage: null,
                        greetTitle: null,
                        greetDescription: null,
                        greetColor: null,
                        greetThumbnailUrl: null,
                        greetImageUrl: null,
                        greetDeleteAfter: null,
                });

                return newConfig;
        }

        /**
         * Clears all greet settings including temp fields and greetConfigs array.
         * @param {string} guildId
         * @returns {Promise<void>}
         */
        async clearGreetConfig(guildId) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, {
                        greetConfigs: [],
                        greetChannelId: null,
                        greetType: null,
                        greetMessage: null,
                        greetTitle: null,
                        greetDescription: null,
                        greetColor: null,
                        greetThumbnailUrl: null,
                        greetImageUrl: null,
                        greetDeleteAfter: null,
                });
        }

        /**
         * Returns the custom join message template, or null if not set.
         * @param {string} guildId
         * @returns {Promise<string|null>}
         */
        async getJoinMessage(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.joinMessage ?? null;
        }

        /**
         * Saves a custom join message template.
         * @param {string} guildId
         * @param {string|null} message
         */
        async setJoinMessage(guildId, message) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { joinMessage: message });
        }

        /**
         * Returns the custom leave message template, or null if not set.
         * @param {string} guildId
         * @returns {Promise<string|null>}
         */
        async getLeaveMessage(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.leaveMessage ?? null;
        }

        /**
         * Saves a custom leave message template.
         * @param {string} guildId
         * @param {string|null} message
         */
        async setLeaveMessage(guildId, message) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { leaveMessage: message });
        }

        /**
         * Returns the configured leave channel ID for a guild.
         * @param {string} guildId
         * @returns {Promise<string|null>}
         */
        async getLeaveChannel(guildId) {
                const guild = await this.ensureGuild(guildId);
                return guild.leaveChannelId ?? null;
        }

        /**
         * Saves the leave channel ID for a guild.
         * @param {string} guildId
         * @param {string|null} channelId
         * @returns {Promise<void>}
         */
        async setLeaveChannel(guildId, channelId) {
                await this.ensureGuild(guildId);
                await this.repo.update(guildId, { leaveChannelId: channelId });
        }

        /**
         * Permanently removes a guild record from the database.
         * Logs an error and returns early if `guildId` is falsy.
         * @param {string} guildId
         * @returns {Promise<void>}
         */
        async deleteGuild(guildId) {
                if (!guildId) {
                        logger.error('GuildService', 'Cannot delete guild: no guildId provided');
                        return;
                }

                await this.repo.delete(guildId);
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